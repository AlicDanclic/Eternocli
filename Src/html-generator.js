/**
 * HTML 时序图生成器（线状波形）
 */

class HTMLGenerator {
    /**
     * 生成完整的 HTML 时序图
     * @param {object} compilationResult 
     * @returns {string} HTML 内容
     */
    generate(compilationResult) {
        const { metadata, signals, waveform } = compilationResult;
        
        return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FlowTime 时序图</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            background: #f5f5f5;
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border: 1px solid #ddd;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header {
            background: #2c3e50;
            color: white;
            padding: 15px 20px;
            border-bottom: 1px solid #34495e;
        }
        
        .header h1 {
            font-size: 1.5em;
            margin-bottom: 5px;
        }
        
        .metadata {
            display: flex;
            justify-content: space-between;
            background: #34495e;
            padding: 10px 20px;
            color: #ecf0f1;
            font-size: 0.9em;
        }
        
        .waveform-container {
            overflow-x: auto;
            position: relative;
        }
        
        .timing-diagram {
            min-width: 100%;
            font-size: 12px;
        }
        
        /* 时间刻度 */
        .time-scale {
            position: relative;
            height: 30px;
            background: #ecf0f1;
            border-bottom: 1px solid #bdc3c7;
        }
        
        .time-scale-background {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
        }
        
        .time-tick {
            position: absolute;
            text-align: center;
            padding: 5px 0;
            color: #2c3e50;
            min-width: 40px;
            transform: translateX(-50%);
        }
        
        .time-tick:after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 50%;
            width: 1px;
            height: 5px;
            background: #7f8c8d;
            transform: translateX(-50%);
        }
        
        /* 信号行 */
        .signal-row {
            display: flex;
            height: 50px;
            border-bottom: 1px solid #ecf0f1;
            position: relative;
        }
        
        .signal-info {
            width: 200px;
            padding: 0 15px;
            background: #f8f9fa;
            border-right: 1px solid #ddd;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .signal-name {
            font-weight: bold;
            color: #2c3e50;
        }
        
        .signal-type {
            color: #7f8c8d;
            font-size: 0.9em;
        }
        
        .signal-waveform {
            flex: 1;
            position: relative;
            background: 
                repeating-linear-gradient(
                    90deg,
                    transparent,
                    transparent 39px,
                    #f0f0f0 39px,
                    #f0f0f0 40px
                );
        }
        
        /* 波形线条样式 */
        .wave-line {
            position: absolute;
            height: 2px;
            background: #000;
            top: 50%;
            transform: translateY(-50%);
        }
        
        .wave-transition {
            position: absolute;
            height: 2px;
        }
        
        /* 信号值状态 */
        .wave-high {
            background: #e74c3c;
        }
        
        .wave-low {
            background: #3498db;
        }
        
        .wave-clock {
            background: #9b59b6;
        }
        
        .wave-bus {
            background: #2ecc71;
        }
        
        .wave-unknown {
            background: #95a5a6;
        }
        
        /* 不确定电平样式 */
        .wave-uncertain {
            border-bottom: 2px dashed;
            background: transparent !important;
            opacity: 0.7;
        }
        
        .uncertain-label {
            color: #e74c3c !important;
            font-style: italic;
        }
        
        /* 值标签 */
        .value-label {
            position: absolute;
            top: -15px;
            background: white;
            padding: 2px 4px;
            border: 1px solid #ddd;
            border-radius: 2px;
            font-size: 0.8em;
            color: #2c3e50;
        }
        
        /* 时钟信号特殊样式 */
        .clock-wave {
            background: transparent;
        }
        
        .clock-pulse {
            position: absolute;
            height: 20px;
            width: 2px;
            background: #9b59b6;
        }
        
        .clock-high {
            position: absolute;
            height: 2px;
            background: #9b59b6;
            top: calc(50% - 10px);
        }
        
        .clock-low {
            position: absolute;
            height: 2px;
            background: #9b59b6;
            top: calc(50% + 10px);
        }
        
        /* 总线波包样式 */
        .bus-wavepacket {
            position: absolute;
            top: 30%;
            bottom: 30%;
            border: 1px solid;
            border-top: none;
            background: rgba(255, 255, 255, 0.1);
        }
        
        .bus-value {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 0.8em;
            font-weight: bold;
            background: white;
            padding: 1px 4px;
            border-radius: 2px;
            border: 1px solid;
        }
        
        .bus-transition {
            position: absolute;
            top: 30%;
            bottom: 30%;
            width: 0;
            border-left: 1px solid;
        }
        
        /* 控制面板 */
        .controls {
            padding: 10px 20px;
            background: #ecf0f1;
            border-top: 1px solid #bdc3c7;
            display: flex;
            gap: 10px;
        }
        
        .btn {
            padding: 5px 10px;
            border: 1px solid #bdc3c7;
            background: white;
            border-radius: 3px;
            cursor: pointer;
            font-size: 0.9em;
        }
        
        .btn:hover {
            background: #3498db;
            color: white;
        }
        
        .footer {
            text-align: center;
            padding: 10px;
            background: #ecf0f1;
            color: #7f8c8d;
            font-size: 0.8em;
            border-top: 1px solid #bdc3c7;
        }
        
        /* 网格线 */
        .grid-line {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 1px;
            background: rgba(0,0,0,0.1);
        }
        
        /* 信号颜色标识 */
        .signal-color {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⏱️ FlowTime 时序图</h1>
            <div>数字逻辑时序波形图</div>
        </div>
        
        <div class="metadata">
            <div>时间单位: <strong>${metadata.timeUnit}</strong></div>
            <div>时间范围: <strong>${metadata.timeScale.start} - ${metadata.timeScale.end}</strong></div>
            <div>信号数量: <strong>${metadata.signalCount}</strong></div>
            <div>事件数量: <strong>${metadata.eventCount}</strong></div>
        </div>
        
        <div class="waveform-container">
            ${this.generateTimeScale(metadata.timeScale)}
            
            <div class="timing-diagram" id="timingDiagram">
                ${this.generateTimingDiagram(signals, waveform, metadata.timeScale)}
            </div>
        </div>
        
        <div class="controls">
            <button class="btn" onclick="zoom(1.2)">放大</button>
            <button class="btn" onclick="zoom(0.8)">缩小</button>
            <button class="btn" onclick="resetZoom()">重置</button>
            <button class="btn" onclick="toggleGrid()">网格</button>
        </div>
        
        <div class="footer">
            Generated by FlowTime Compiler • ${new Date().toLocaleString()}
        </div>
    </div>

    <script>
        let currentScale = 1;
        let gridVisible = true;
        
        function zoom(factor) {
            currentScale *= factor;
            const diagram = document.getElementById('timingDiagram');
            const timeScale = document.getElementById('timeScale');
            
            diagram.style.transform = 'scaleX(' + currentScale + ')';
            diagram.style.transformOrigin = 'left top';
            timeScale.style.transform = 'scaleX(' + currentScale + ')';
            timeScale.style.transformOrigin = 'left top';
        }
        
        function resetZoom() {
            currentScale = 1;
            const diagram = document.getElementById('timingDiagram');
            const timeScale = document.getElementById('timeScale');
            
            diagram.style.transform = 'scaleX(1)';
            timeScale.style.transform = 'scaleX(1)';
        }
        
        function toggleGrid() {
            gridVisible = !gridVisible;
            const grids = document.querySelectorAll('.grid-line');
            grids.forEach(grid => {
                grid.style.display = gridVisible ? 'block' : 'none';
            });
        }
        
        // 添加信号点击高亮
        document.addEventListener('DOMContentLoaded', function() {
            const signalRows = document.querySelectorAll('.signal-row');
            signalRows.forEach(row => {
                row.addEventListener('click', function() {
                    signalRows.forEach(r => r.style.background = '');
                    this.style.background = '#f0f8ff';
                });
            });
            
            // 添加网格线
            addGridLines();
        });
        
        function addGridLines() {
            const timeTicks = document.querySelectorAll('.time-tick');
            const waveformContainer = document.querySelector('.waveform-container');
            
            // 清除现有网格线
            const existingGrids = document.querySelectorAll('.grid-line');
            existingGrids.forEach(grid => grid.remove());
            
            timeTicks.forEach(tick => {
                const gridLine = document.createElement('div');
                gridLine.className = 'grid-line';
                const rect = tick.getBoundingClientRect();
                const containerRect = waveformContainer.getBoundingClientRect();
                gridLine.style.left = (rect.left - containerRect.left + rect.width / 2) + 'px';
                waveformContainer.appendChild(gridLine);
            });
        }
    </script>
</body>
</html>`;
    }

    /**
     * 生成时间刻度
     */
    generateTimeScale(timeScale) {
        const { start, end } = timeScale;
        const ticks = [];
        const totalTime = end - start;
        const step = Math.max(1, Math.floor(totalTime / 20));
        
        for (let time = start; time <= end; time += step) {
            const position = ((time - start) / totalTime) * 100;
            ticks.push(`<div class="time-tick" style="left: ${position}%">${time}</div>`);
        }
        
        return `
        <div class="time-scale" id="timeScale">
            <div class="time-scale-background"></div>
            ${ticks.join('')}
        </div>`;
    }

    /**
     * 生成时序图
     */
    generateTimingDiagram(signals, waveform, timeScale) {
        const { start, end } = timeScale;
        const totalTime = end - start;
        
        return signals.map(signal => {
            const signalData = waveform[signal.name];
            const transitions = signalData.transitions;
            
            return `
            <div class="signal-row">
                <div class="signal-info">
                    <div style="display: flex; align-items: center;">
                        <div class="signal-color" style="background: ${signal.attributes.color || this.getDefaultColor(signal.type)}"></div>
                        <div>
                            <div class="signal-name">${signal.attributes.label || signal.name}</div>
                            <div class="signal-type">${this.getTypeDisplay(signal.type)}</div>
                        </div>
                    </div>
                </div>
                <div class="signal-waveform">
                    ${this.generateSignalWaveform(signal, transitions, totalTime, start)}
                </div>
            </div>`;
        }).join('');
    }

    /**
     * 生成信号波形（线状）
     */
    generateSignalWaveform(signal, transitions, totalTime, startTime) {
        let waveformHTML = '';
        
        if (signal.type.type === 'clock') {
            waveformHTML = this.generateClockWaveform(signal, transitions, totalTime, startTime);
        } else if (signal.type.type === 'bus' || signal.type.width > 1) {
            waveformHTML = this.generateBusWaveform(signal, transitions, totalTime, startTime);
        } else {
            waveformHTML = this.generateBitWaveform(signal, transitions, totalTime, startTime);
        }
        
        return waveformHTML;
    }

    /**
     * 生成比特信号波形（带斜边和不确定电平支持）
     */
    generateBitWaveform(signal, transitions, totalTime, startTime) {
        let html = '';
        const signalColor = signal.attributes.color || this.getDefaultColor(signal.type);
        const transitionTime = totalTime * 0.02; // 跳变时间占总时间的2%
        
        for (let i = 0; i < transitions.length - 1; i++) {
            const current = transitions[i];
            const next = transitions[i + 1];
            
            const start = current.time - startTime;
            const duration = next.time - current.time;
            
            const left = (start / totalTime) * 100;
            const width = (duration / totalTime) * 100;
            const transitionWidth = Math.min(width * 0.1, 2); // 跳变宽度
            
        const isUncertain = current.value === 'X' || current.value === 'Z';
        const nextIsUncertain = next.value === 'X' || next.value === 'Z';
        
        if (isUncertain) {
            // 不确定电平 - 用虚线表示在中间位置
            html += `
            <div class="wave-line wave-uncertain" 
                 style="left: ${left}%; width: ${width}%; top: 50%; background: ${signalColor};"
                 data-signal="${signal.name}" 
                 data-time="${current.time}" 
                 data-value="${current.value}">
            </div>`;
            
            // 显示不确定标识
            if (width > 8) {
                html += `
                <div class="value-label uncertain-label" style="left: ${left + width/2}%;">
                    ${current.value}
                </div>`;
            }
        } else {
            // 正常电平信号
            const isHigh = current.value === '1' || current.value === 'H' || current.value === 'h';
            const nextIsHigh = next.value === '1' || next.value === 'H' || next.value === 'h';
            
            const levelClass = isHigh ? 'wave-high' : 'wave-low';
            const levelY = isHigh ? '30%' : '70%';
            const nextLevelY = nextIsHigh ? '30%' : '70%';
            
            // 稳定部分
            const stableWidth = Math.max(0, width - transitionWidth);
            if (stableWidth > 0) {
                html += `
                <div class="wave-line ${levelClass}" 
                     style="left: ${left}%; width: ${stableWidth}%; top: ${levelY}; background: ${signalColor};"
                     data-signal="${signal.name}" 
                     data-time="${current.time}" 
                     data-value="${current.value}">
                </div>`;
            }
            
            // 跳变部分（斜边）
            if (isHigh !== nextIsHigh && !nextIsUncertain) {
                const transitionLeft = left + stableWidth;
                html += `
                <div class="wave-transition" 
                     style="left: ${transitionLeft}%; width: ${transitionWidth}%; 
                            background: linear-gradient(to right, 
                                ${signalColor} 0%, 
                                ${signalColor} 100%); 
                            clip-path: polygon(0% ${levelY}, 100% ${nextLevelY}, 100% calc(${nextLevelY} + 2px), 0% calc(${levelY} + 2px));"
                     data-signal="${signal.name}">
                </div>`;
            }
            
            // 值标签
            if (width > 5) {
                html += `
                <div class="value-label" style="left: ${left + width/2}%;">
                    ${this.formatBitValue(current.value)}
                </div>`;
            }
        }
        }
        
        return html;
    }

    /**
     * 生成时钟信号波形
     */
    generateClockWaveform(signal, transitions, totalTime, startTime) {
        let html = '';
        const signalColor = signal.attributes.color || this.getDefaultColor(signal.type);
        
        // 时钟信号需要特殊处理，生成方波
        let currentTime = startTime;
        let currentValue = '0';
        
        // 找到第一个非零时间的事件来确定初始状态
        if (transitions.length > 0 && transitions[0].time === startTime) {
            currentValue = transitions[0].value;
        }
        
        let transitionIndex = 0;
        
        while (currentTime < startTime + totalTime) {
            // 找到下一个跳变点
            let nextTransitionTime = startTime + totalTime;
            if (transitionIndex < transitions.length) {
                nextTransitionTime = transitions[transitionIndex].time;
            }
            
            const segmentDuration = nextTransitionTime - currentTime;
            if (segmentDuration <= 0) {
                transitionIndex++;
                continue;
            }
            
            const segmentX = ((currentTime - startTime) / totalTime) * 100;
            const segmentWidth = (segmentDuration / totalTime) * 100;
            
            if (currentValue === '1' || currentValue === 'H' || currentValue === 'h') {
                // 高电平：绘制上方的水平线
                html += `
                <div class="clock-high" style="left: ${segmentX}%; width: ${segmentWidth}%; background: ${signalColor};"></div>`;
                
                // 上升沿和下降沿
                html += `
                <div class="clock-pulse" style="left: ${segmentX}%; background: ${signalColor};"></div>`;
                html += `
                <div class="clock-pulse" style="left: ${segmentX + segmentWidth}%; background: ${signalColor};"></div>`;
            } else {
                // 低电平：绘制下方的水平线
                html += `
                <div class="clock-low" style="left: ${segmentX}%; width: ${segmentWidth}%; background: ${signalColor};"></div>`;
            }
            
            // 移动到下一个时间段
            currentTime = nextTransitionTime;
            if (transitionIndex < transitions.length) {
                currentValue = transitions[transitionIndex].value;
                transitionIndex++;
            }
        }
        
        return html;
    }

    /**
     * 生成总线信号波形（波包形式）
     */
    generateBusWaveform(signal, transitions, totalTime, startTime) {
        let html = '';
        const signalColor = signal.attributes.color || this.getDefaultColor(signal.type);
        
        for (let i = 0; i < transitions.length - 1; i++) {
            const current = transitions[i];
            const next = transitions[i + 1];
            
            const start = current.time - startTime;
            const duration = next.time - current.time;
            
            const left = (start / totalTime) * 100;
            const width = (duration / totalTime) * 100;
            
            // 总线信号用波包形式表示
            const displayValue = this.formatBusValue(current.value);
            
            html += `
            <div class="bus-wavepacket" 
                 style="left: ${left}%; width: ${width}%; border-color: ${signalColor};"
                 data-signal="${signal.name}" 
                 data-time="${current.time}" 
                 data-value="${current.value}">
                <div class="bus-value" style="color: ${signalColor};">${displayValue}</div>
            </div>`;
            
            // 在值变化时绘制跳变线
            if (i < transitions.length - 1 && width > 0) {
                const transitionLeft = left + width;
                html += `
                <div class="bus-transition" 
                     style="left: ${transitionLeft}%; border-color: ${signalColor};"
                     data-signal="${signal.name}" 
                     data-time="${next.time}">
                </div>`;
            }
        }
        
        return html;
    }

    /**
     * 格式化比特值显示
     */
    formatBitValue(value) {
        if (value === '1') return 'H';
        if (value === '0') return 'L';
        if (value === 'X' || value === 'Z') return value;
        return value;
    }

    /**
     * 格式化总线值显示
     */
    formatBusValue(value) {
        if (value === 'X' || value === 'Z') return value;
        
        if (value.length <= 8) {
            try {
                const decimal = parseInt(value, 2);
                return `0x${decimal.toString(16).toUpperCase()}`;
            } catch {
                return value;
            }
        }
        return value;
    }

    /**
     * 获取类型显示文本
     */
    getTypeDisplay(signalType) {
        switch (signalType.type) {
            case 'bit': return 'Bit';
            case 'clock': return 'Clock';
            case 'bus': return `Bus[${signalType.width}]`;
            case 'enum': return 'Enum';
            default: return signalType.type;
        }
    }

    /**
     * 获取默认颜色
     */
    getDefaultColor(signalType) {
        const colors = {
            bit: '#3498db',
            clock: '#9b59b6', 
            bus: '#2ecc71',
            enum: '#e67e22'
        };
        return colors[signalType.type] || '#95a5a6';
    }
}

module.exports = HTMLGenerator;