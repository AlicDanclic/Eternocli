/**
 * 线状时序图图片生成器
 */

class ImageGenerator {
    constructor() {
        try {
            this.canvas = require('canvas');
        } catch (error) {
            console.warn('未安装 canvas 依赖，图片生成功能不可用');
            console.warn('请运行: npm install canvas');
            this.canvas = null;
        }
    }

    /**
     * 生成 PNG 时序图
     * @param {object} compilationResult 
     * @param {string} outputPath 
     */
    async generatePNG(compilationResult, outputPath) {
        if (!this.canvas) {
            throw new Error('canvas 依赖未安装，无法生成图片');
        }

        const { metadata, signals, waveform } = compilationResult;
        const { createCanvas } = this.canvas;
        
        // 计算画布尺寸
        const signalHeight = 40;
        const timeScaleHeight = 25;
        const margin = 30;
        const headerHeight = 60;
        const footerHeight = 20;
        const width = 1600;
        const height = headerHeight + timeScaleHeight + signals.length * signalHeight + footerHeight;
        
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        
        // 绘制背景
        this.drawBackground(ctx, width, height);
        
        // 绘制标题
        this.drawHeader(ctx, metadata, width, headerHeight);
        
        // 绘制时间刻度
        const waveformArea = {
            x: margin,
            y: headerHeight,
            width: width - 2 * margin,
            height: height - headerHeight - footerHeight
        };
        
        this.drawTimeScale(ctx, metadata.timeScale, waveformArea);
        
        // 绘制信号波形
        this.drawSignalWaveforms(ctx, signals, waveform, metadata.timeScale, waveformArea, signalHeight);
        
        // 绘制页脚
        this.drawFooter(ctx, width, height, footerHeight);
        
        // 保存图片
        const fs = require('fs');
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);
        
        return outputPath;
    }

    /**
     * 绘制背景
     */
    drawBackground(ctx, width, height) {
        // 白色背景
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        
        // 边框
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, width, height);
    }

    /**
     * 绘制标题
     */
    drawHeader(ctx, metadata, width, headerHeight) {
        // 标题背景
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(0, 0, width, headerHeight - 20);
        
        // 主标题
        ctx.fillStyle = 'white';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('FlowTime 时序图', width / 2, 25);
        
        // 副标题
        ctx.font = '12px Arial';
        ctx.fillText('数字逻辑时序波形图', width / 2, 45);
        
        // 元数据
        ctx.fillStyle = '#34495e';
        ctx.fillRect(0, headerHeight - 20, width, 20);
        
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        const metaText = `时间单位: ${metadata.timeUnit} | 范围: ${metadata.timeScale.start}-${metadata.timeScale.end} | 信号: ${metadata.signalCount} | 事件: ${metadata.eventCount}`;
        ctx.fillText(metaText, 10, headerHeight - 5);
    }

    /**
     * 绘制时间刻度
     */
    drawTimeScale(ctx, timeScale, waveformArea) {
        const { start, end } = timeScale;
        const totalTime = end - start;
        
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(waveformArea.x, waveformArea.y, waveformArea.width, 25);
        
        ctx.strokeStyle = '#bdc3c7';
        ctx.lineWidth = 1;
        ctx.strokeRect(waveformArea.x, waveformArea.y, waveformArea.width, 25);
        
        ctx.fillStyle = '#2c3e50';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        
        const tickCount = Math.min(30, totalTime);
        for (let i = 0; i <= tickCount; i++) {
            const time = Math.round(start + (i / tickCount) * totalTime);
            const x = waveformArea.x + (i / tickCount) * waveformArea.width;
            
            // 刻度线
            ctx.beginPath();
            ctx.moveTo(x, waveformArea.y);
            ctx.lineTo(x, waveformArea.y + 25);
            ctx.strokeStyle = '#95a5a6';
            ctx.stroke();
            
            // 时间标签
            ctx.fillText(time, x, waveformArea.y + 15);
        }
    }

    /**
     * 绘制信号波形
     */
    drawSignalWaveforms(ctx, signals, waveform, timeScale, waveformArea, signalHeight) {
        const { start, end } = timeScale;
        const totalTime = end - start;
        const orderedSignals = this.getOrderedSignals(signals);
        
        // 绘制网格
        this.drawGrid(ctx, timeScale, waveformArea, signalHeight, orderedSignals.length);
        
        let y = waveformArea.y + 25;
        
        for (const signal of orderedSignals) {
            // 信号信息区域
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(waveformArea.x, y, 200, signalHeight);
            ctx.strokeStyle = '#ddd';
            ctx.strokeRect(waveformArea.x, y, 200, signalHeight);
            
            // 信号名称和类型
            const signalData = waveform[signal.name];
            const signalColor = this.getSignalColor(signal);
            
            // 颜色标识
            ctx.fillStyle = signalColor;
            ctx.fillRect(waveformArea.x + 10, y + 15, 8, 8);
            
            // 信号名称
            ctx.fillStyle = '#2c3e50';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(signal.attributes.label || signal.name, waveformArea.x + 25, y + 15);
            
            // 信号类型
            ctx.fillStyle = '#7f8c8d';
            ctx.font = '10px Arial';
            ctx.fillText(this.getTypeDisplay(signal.type), waveformArea.x + 25, y + 28);
            
            // 绘制波形
            this.drawSignalWaveform(ctx, signal, signalData, timeScale, waveformArea, y, signalHeight);
            
            y += signalHeight;
        }
    }

    /**
     * 绘制单个信号波形
     */
    drawSignalWaveform(ctx, signal, signalData, timeScale, waveformArea, y, signalHeight) {
        const { start, end } = timeScale;
        const totalTime = end - start;
        const transitions = signalData.transitions;
        const signalColor = this.getSignalColor(signal);
        const waveformX = waveformArea.x + 200;
        const waveformWidth = waveformArea.width - 200;
        
        ctx.strokeStyle = signalColor;
        ctx.lineWidth = 2;
        ctx.fillStyle = signalColor;
        
        if (signal.type.type === 'clock') {
            this.drawClockWaveform(ctx, signal, transitions, timeScale, waveformX, y, waveformWidth, signalHeight);
        } else if (signal.type.type === 'bus' || signal.type.width > 1) {
            this.drawBusWaveform(ctx, signal, transitions, timeScale, waveformX, y, waveformWidth, signalHeight);
        } else {
            this.drawBitWaveform(ctx, signal, transitions, timeScale, waveformX, y, waveformWidth, signalHeight);
        }
    }

    /**
     * 绘制比特信号波形
     */
    drawBitWaveform(ctx, signal, transitions, timeScale, x, y, width, signalHeight) {
        const { start, end } = timeScale;
        const totalTime = end - start;
        const centerY = y + signalHeight / 2;
        const highY = centerY - 8;
        const lowY = centerY + 8;
        
        ctx.lineWidth = 2;
        
        for (let i = 0; i < transitions.length - 1; i++) {
            const current = transitions[i];
            const next = transitions[i + 1];
            
            const startPos = (current.time - start) / totalTime;
            const duration = (next.time - current.time) / totalTime;
            
            const segmentX = x + startPos * width;
            const segmentWidth = duration * width;
            
            const isHigh = current.value === '1' || current.value === 'H' || current.value === 'h';
            const levelY = isHigh ? highY : lowY;
            
            // 绘制水平线段
            ctx.beginPath();
            ctx.moveTo(segmentX, levelY);
            ctx.lineTo(segmentX + segmentWidth, levelY);
            ctx.stroke();
            
            // 绘制跳变沿
            if (i < transitions.length - 1) {
                ctx.beginPath();
                ctx.moveTo(segmentX + segmentWidth, levelY);
                
                const nextIsHigh = next.value === '1' || next.value === 'H' || next.value === 'h';
                const nextLevelY = nextIsHigh ? highY : lowY;
                ctx.lineTo(segmentX + segmentWidth, nextLevelY);
                ctx.stroke();
            }
            
            // 绘制值标签
            if (segmentWidth > 30) {
                ctx.fillStyle = '#2c3e50';
                ctx.font = '9px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(this.formatBitValue(current.value), segmentX + segmentWidth / 2, levelY - 5);
            }
        }
    }

    /**
     * 绘制时钟信号波形
     */
    drawClockWaveform(ctx, signal, transitions, timeScale, x, y, width, signalHeight) {
        const { start, end } = timeScale;
        const totalTime = end - start;
        const centerY = y + signalHeight / 2;
        const highY = centerY - 8;
        const lowY = centerY + 8;
        
        ctx.lineWidth = 2;
        
        // 生成时钟脉冲
        let currentTime = start;
        let currentValue = '0';
        
        if (transitions.length > 0 && transitions[0].time === start) {
            currentValue = transitions[0].value;
        }
        
        let transitionIndex = 0;
        const pulseWidth = Math.max(10, width / totalTime * 5); // 脉冲宽度
        
        while (currentTime < end) {
            // 找到下一个跳变点
            let nextTransitionTime = end;
            if (transitionIndex < transitions.length) {
                nextTransitionTime = transitions[transitionIndex].time;
            }
            
            const segmentDuration = nextTransitionTime - currentTime;
            if (segmentDuration <= 0) {
                transitionIndex++;
                continue;
            }
            
            const segmentX = x + ((currentTime - start) / totalTime) * width;
            const segmentWidth = (segmentDuration / totalTime) * width;
            
            if (currentValue === '1' || currentValue === 'H' || currentValue === 'h') {
                // 高电平脉冲
                const pulseSegments = Math.floor(segmentWidth / pulseWidth);
                
                for (let i = 0; i < pulseSegments; i++) {
                    const pulseX = segmentX + i * pulseWidth;
                    
                    // 上升沿
                    ctx.beginPath();
                    ctx.moveTo(pulseX, lowY);
                    ctx.lineTo(pulseX, highY);
                    ctx.stroke();
                    
                    // 高电平
                    ctx.beginPath();
                    ctx.moveTo(pulseX, highY);
                    ctx.lineTo(pulseX + pulseWidth / 2, highY);
                    ctx.stroke();
                    
                    // 下降沿
                    ctx.beginPath();
                    ctx.moveTo(pulseX + pulseWidth / 2, highY);
                    ctx.lineTo(pulseX + pulseWidth / 2, lowY);
                    ctx.stroke();
                    
                    // 低电平
                    if (i < pulseSegments - 1) {
                        ctx.beginPath();
                        ctx.moveTo(pulseX + pulseWidth / 2, lowY);
                        ctx.lineTo(pulseX + pulseWidth, lowY);
                        ctx.stroke();
                    }
                }
            } else {
                // 持续低电平
                ctx.beginPath();
                ctx.moveTo(segmentX, lowY);
                ctx.lineTo(segmentX + segmentWidth, lowY);
                ctx.stroke();
            }
            
            currentTime = nextTransitionTime;
            if (transitionIndex < transitions.length) {
                currentValue = transitions[transitionIndex].value;
                transitionIndex++;
            }
        }
    }

    /**
     * 绘制总线信号波形
     */
    drawBusWaveform(ctx, signal, transitions, timeScale, x, y, width, signalHeight) {
        const { start, end } = timeScale;
        const totalTime = end - start;
        const centerY = y + signalHeight / 2;
        
        ctx.lineWidth = 2;
        
        for (let i = 0; i < transitions.length - 1; i++) {
            const current = transitions[i];
            const next = transitions[i + 1];
            
            const startPos = (current.time - start) / totalTime;
            const duration = (next.time - current.time) / totalTime;
            
            const segmentX = x + startPos * width;
            const segmentWidth = duration * width;
            
            // 绘制水平线段
            ctx.beginPath();
            ctx.moveTo(segmentX, centerY);
            ctx.lineTo(segmentX + segmentWidth, centerY);
            ctx.stroke();
            
            // 绘制跳变沿
            if (i < transitions.length - 1) {
                ctx.beginPath();
                ctx.moveTo(segmentX + segmentWidth, centerY);
                ctx.lineTo(segmentX + segmentWidth, centerY);
                ctx.stroke();
            }
            
            // 绘制值标签
            if (segmentWidth > 40) {
                ctx.fillStyle = '#2c3e50';
                ctx.font = '9px Arial';
                ctx.textAlign = 'center';
                const displayValue = this.formatBusValue(current.value);
                ctx.fillText(displayValue, segmentX + segmentWidth / 2, centerY - 8);
            }
        }
    }

    /**
     * 绘制网格
     */
    drawGrid(ctx, timeScale, waveformArea, signalHeight, signalCount) {
        const { start, end } = timeScale;
        const totalTime = end - start;
        
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 0.5;
        
        // 垂直网格线（时间刻度）
        const tickCount = Math.min(30, totalTime);
        for (let i = 0; i <= tickCount; i++) {
            const x = waveformArea.x + 200 + (i / tickCount) * (waveformArea.width - 200);
            
            ctx.beginPath();
            ctx.moveTo(x, waveformArea.y + 25);
            ctx.lineTo(x, waveformArea.y + 25 + signalCount * signalHeight);
            ctx.stroke();
        }
        
        // 水平网格线（信号分隔）
        for (let i = 0; i <= signalCount; i++) {
            const y = waveformArea.y + 25 + i * signalHeight;
            
            ctx.beginPath();
            ctx.moveTo(waveformArea.x, y);
            ctx.lineTo(waveformArea.x + waveformArea.width, y);
            ctx.stroke();
        }
    }

    /**
     * 绘制页脚
     */
    drawFooter(ctx, width, height, footerHeight) {
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(0, height - footerHeight, width, footerHeight);
        
        ctx.fillStyle = '#7f8c8d';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Generated by FlowTime Compiler • ${new Date().toLocaleString()}`, width / 2, height - 5);
    }

    /**
     * 获取信号颜色
     */
    getSignalColor(signal) {
        if (signal.attributes.color) {
            return signal.attributes.color;
        }
        
        const colors = {
            bit: '#3498db',
            clock: '#9b59b6',
            bus: '#2ecc71', 
            enum: '#e67e22'
        };
        
        return colors[signal.type.type] || '#95a5a6';
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
     * 格式化比特值
     */
    formatBitValue(value) {
        if (value === '1') return 'H';
        if (value === '0') return 'L';
        return value;
    }

    /**
     * 格式化总线值
     */
    formatBusValue(value) {
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
     * 获取有序信号列表
     */
    getOrderedSignals(signals) {
        return signals.sort((a, b) => {
            if (a.type.type === 'clock' && b.type.type !== 'clock') return -1;
            if (a.type.type !== 'clock' && b.type.type === 'clock') return 1;
            return a.name.localeCompare(b.name);
        });
    }
}

module.exports = ImageGenerator;