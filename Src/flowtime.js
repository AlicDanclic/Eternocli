/**
 * FlowTime 编译器主模块
 */

class FlowTimeCompiler {
    constructor() {
        this.signals = new Map();
        this.events = [];
        this.timeUnit = '1ns';
        this.timeScale = { start: 0, end: 100 };
        this.currentTime = 0;
    }

    /**
     * 编译 FlowTime 源代码
     * @param {string} source 
     * @returns {object} 编译结果
     */
    compile(source) {
        try {
            this.signals.clear();
            this.events = [];
            
            const lines = source.split('\n');
            let lineNumber = 0;

            for (let line of lines) {
                lineNumber++;
                line = line.trim();
                
                // 跳过空行和注释
                if (!line || line.startsWith('//')) continue;
                if (line.startsWith('/*')) {
                    // 处理多行注释
                    while (!line.includes('*/') && lineNumber < lines.length) {
                        lineNumber++;
                        line = lines[lineNumber - 1].trim();
                    }
                    continue;
                }

                this.parseLine(line, lineNumber);
            }

            return this.generateOutput();
        } catch (error) {
            throw new Error(`编译错误: ${error.message} (第 ${error.lineNumber} 行)`);
        }
    }

    /**
     * 解析单行代码
     * @param {string} line 
     * @param {number} lineNumber 
     */
    parseLine(line, lineNumber) {
        // 信号声明
        if (line.startsWith('signal ')) {
            this.parseSignalDeclaration(line, lineNumber);
        }
        // 时间单位定义
        else if (line.startsWith('timeunit ')) {
            this.parseTimeUnit(line, lineNumber);
        }
        // 时间范围定义
        else if (line.startsWith('timescale ')) {
            this.parseTimeScale(line, lineNumber);
        }
        // 波形事件
        else if (line.startsWith('@')) {
            this.parseWaveformEvent(line, lineNumber);
        }
        else {
            throw new Error(`无法识别的语法: ${line}`, lineNumber);
        }
    }

    /**
     * 解析信号声明
     */
    parseSignalDeclaration(line, lineNumber) {
        const signalRegex = /signal\s+(\w+)(?::(\w+(?:\[\d+\])?))?(?:\s*=\s*([^\s]+))?(?:\s*(.*))?/;
        const match = line.match(signalRegex);
        
        if (!match) {
            throw new Error(`无效的信号声明: ${line}`, lineNumber);
        }

        const [, name, type = 'bit', initialValue, attributes] = match;
        
        const signal = {
            name,
            type: this.parseSignalType(type),
            initialValue: this.parseValue(initialValue || '0', type),
            attributes: this.parseAttributes(attributes),
            events: []
        };

        this.signals.set(name, signal);
    }

    /**
     * 解析信号类型
     */
    parseSignalType(typeStr) {
        if (typeStr === 'bit') return { type: 'bit', width: 1 };
        if (typeStr === 'clock') return { type: 'clock', width: 1 };
        
        const busMatch = typeStr.match(/bus\[(\d+)\]/);
        if (busMatch) return { type: 'bus', width: parseInt(busMatch[1]) };
        
        if (typeStr === 'enum') return { type: 'enum', width: 1 };
        
        return { type: 'bit', width: 1 };
    }

    /**
     * 解析属性
     */
    parseAttributes(attrStr) {
        if (!attrStr) return {};
        
        const attrs = {};
        const attrRegex = /(\w+)=([^\s]+)/g;
        let match;
        
        while ((match = attrRegex.exec(attrStr)) !== null) {
            attrs[match[1]] = match[2];
        }
        
        return attrs;
    }

    /**
     * 解析值（支持不确定电平）
     */
    parseValue(valueStr, type) {
        if (!valueStr) return '0';
        
        // 支持不确定值
        if (valueStr === 'X' || valueStr === 'x' || valueStr === 'Z' || valueStr === 'z') {
            return valueStr.toUpperCase();
        }
        
        // 处理十六进制格式 8'hFF
        const hexMatch = valueStr.match(/^(\d+)'h([0-9A-Fa-f]+)$/);
        if (hexMatch) {
            const width = parseInt(hexMatch[1]);
            const value = parseInt(hexMatch[2], 16);
            return value.toString(2).padStart(width, '0');
        }
        
        // 处理二进制格式 8'b1010
        const binMatch = valueStr.match(/^(\d+)'b([01]+)$/);
        if (binMatch) {
            const width = parseInt(binMatch[1]);
            return binMatch[2].padStart(width, '0');
        }
        
        return valueStr;
    }

    /**
     * 解析时间单位
     */
    parseTimeUnit(line, lineNumber) {
        const timeunitRegex = /timeunit\s+(\d+)(\w+)\s*=\s*(\d+)ns/;
        const match = line.match(timeunitRegex);
        
        if (!match) {
            throw new Error(`无效的时间单位定义: ${line}`, lineNumber);
        }
        
        this.timeUnit = line.split('=')[1].trim();
    }

    /**
     * 解析时间范围
     */
    parseTimeScale(line, lineNumber) {
        const timescaleRegex = /timescale\s+(\d+)\s+to\s+(\d+)/;
        const match = line.match(timescaleRegex);
        
        if (!match) {
            throw new Error(`无效的时间范围定义: ${line}`, lineNumber);
        }
        
        this.timeScale = {
            start: parseInt(match[1]),
            end: parseInt(match[2])
        };
    }

    /**
     * 解析波形事件
     */
    parseWaveformEvent(line, lineNumber) {
        const eventRegex = /@(\d+)\s+(\w+)\s+(?:=\s*([^\s]+)|pulse\s+(\d+)(?:\s+([^\s]+))?|repeat\s+([^\s]+)\s+every\s+(\d+)\s+for\s+(\d+))/;
        const match = line.match(eventRegex);
        
        if (!match) {
            throw new Error(`无效的波形事件: ${line}`, lineNumber);
        }

        const time = parseInt(match[1]);
        const signalName = match[2];
        const signal = this.signals.get(signalName);
        
        if (!signal) {
            throw new Error(`未定义的信号: ${signalName}`, lineNumber);
        }

        this.currentTime = time;

        // 赋值事件
        if (match[3]) {
            const value = this.parseValue(match[3], signal.type.type);
            this.addSignalEvent(signalName, time, 'set', { value });
        }
        // 脉冲事件
        else if (match[4]) {
            const width = parseInt(match[4]);
            const pulseValue = match[5] || '1';
            this.parsePulseEvent(signalName, time, width, pulseValue);
        }
        // 重复事件
        else if (match[6]) {
            const pattern = match[6];
            const period = parseInt(match[7]);
            const cycles = parseInt(match[8]);
            this.parseRepeatEvent(signalName, time, pattern, period, cycles);
        }
    }

    /**
     * 解析脉冲事件
     */
    parsePulseEvent(signalName, startTime, width, value) {
        const signal = this.signals.get(signalName);
        const parsedValue = this.parseValue(value, signal.type.type);
        
        // 脉冲开始
        this.addSignalEvent(signalName, startTime, 'set', { value: parsedValue });
        // 脉冲结束
        this.addSignalEvent(signalName, startTime + width, 'set', { value: '0' });
    }

    /**
     * 解析重复事件
     */
    parseRepeatEvent(signalName, startTime, pattern, period, cycles) {
        for (let i = 0; i < cycles; i++) {
            const currentTime = startTime + i * period;
            this.addSignalEvent(signalName, currentTime, 'set', { value: pattern });
        }
    }

    /**
     * 添加信号事件
     */
    addSignalEvent(signalName, time, type, data) {
        this.events.push({
            time,
            signal: signalName,
            type,
            ...data
        });

        const signal = this.signals.get(signalName);
        if (signal) {
            signal.events.push({
                time,
                type,
                ...data
            });
        }
    }

    /**
     * 生成输出结果
     */
    generateOutput() {
        // 按时间排序事件
        this.events.sort((a, b) => a.time - b.time);
        
        // 为每个信号的事件排序
        for (const signal of this.signals.values()) {
            signal.events.sort((a, b) => a.time - b.time);
        }

        return {
            metadata: {
                timeUnit: this.timeUnit,
                timeScale: this.timeScale,
                signalCount: this.signals.size,
                eventCount: this.events.length
            },
            signals: Array.from(this.signals.values()),
            events: this.events,
            waveform: this.generateWaveformData()
        };
    }

    /**
     * 生成波形数据
     */
    generateWaveformData() {
        const waveform = {};
        
        for (const [name, signal] of this.signals) {
            waveform[name] = {
                type: signal.type,
                attributes: signal.attributes,
                transitions: this.generateSignalTransitions(signal)
            };
        }
        
        return waveform;
    }

    /**
     * 生成信号跳变数据
     */
    generateSignalTransitions(signal) {
        const transitions = [];
        let currentValue = signal.initialValue;
        let currentTime = this.timeScale.start;

        // 添加初始状态
        transitions.push({
            time: currentTime,
            value: currentValue
        });

        // 添加所有事件
        for (const event of signal.events) {
            if (event.time > currentTime && event.time <= this.timeScale.end) {
                transitions.push({
                    time: event.time,
                    value: event.value
                });
                currentValue = event.value;
                currentTime = event.time;
            }
        }

        // 添加结束状态
        if (currentTime < this.timeScale.end) {
            transitions.push({
                time: this.timeScale.end,
                value: currentValue
            });
        }

        return transitions;
    }

    /**
     * 获取信号列表（按类型排序，时钟信号优先）
     */
    getOrderedSignals() {
        const signals = Array.from(this.signals.values());
        // 时钟信号放在最上面
        return signals.sort((a, b) => {
            if (a.type.type === 'clock' && b.type.type !== 'clock') return -1;
            if (a.type.type !== 'clock' && b.type.type === 'clock') return 1;
            return a.name.localeCompare(b.name);
        });
    }
}

module.exports = FlowTimeCompiler;