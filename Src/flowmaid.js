const fs = require('fs-extra');
const path = require('path');
const yaml = require('yaml');

class FlowmaidCompiler {
  constructor() {
    // 支持不同的标题级别
    this.headerRegex = /^(#+)\s*(.*?)\s*(?:\[(.*)\])?$/;
    this.itemRegex = /^(\s*)-?\s*(.*?)\s*(?:\[(.*)\])?$/;
  }

  // 解析 Flowmaid 内容
  parseFlowmaid(content) {
    const lines = content.split('\n');
    let metadata = {};
    let nodes = [];
    let currentLevel = 0;
    let nodeStack = [];
    
    // 查找元数据部分
    const metadataStart = lines.findIndex(line => line.trim() === '---');
    if (metadataStart !== -1) {
      const metadataEnd = lines.slice(metadataStart + 1).findIndex(line => line.trim() === '---');
      if (metadataEnd !== -1) {
        const metadataContent = lines.slice(metadataStart + 1, metadataStart + 1 + metadataEnd).join('\n');
        try {
          metadata = yaml.parse(metadataContent) || {};
        } catch (e) {
          console.warn('Warning: Invalid metadata format');
        }
        // 移除元数据行
        lines.splice(metadataStart, metadataEnd + 2);
      }
    }
    
    // 解析每一行
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        continue;
      }
      if(line === '---'){
        break;
      }
      // 检查是否是标题 (#, ##, ### 等)
      const headerMatch = line.match(this.headerRegex);
      if (headerMatch) {
        const level = headerMatch[1].length; // # 的数量
        const title = headerMatch[2].trim();
        const attrs = this.parseAttributes(headerMatch[3]);
        
        const node = {
          name: title,
          attributes: attrs,
          level: level,
          children: []
        };
        
        if (level === 1) {
          // 根节点
          nodes.push(node);
          nodeStack = [node];
          currentLevel = 1;
        } else {
          // 子标题
          while (nodeStack.length >= level) {
            nodeStack.pop();
          }
          
          if (nodeStack.length > 0) {
            const parent = nodeStack[nodeStack.length - 1];
            parent.children.push(node);
            nodeStack.push(node);
            currentLevel = level;
          }
        }
        continue;
      }
      
      // 检查是否是列表项 (-)
      const itemMatch = line.match(this.itemRegex);
      if (itemMatch) {
        const indent = itemMatch[1].length;
        const title = itemMatch[2].trim();
        const attrs = this.parseAttributes(itemMatch[3]);
        
        const node = {
          name: title,
          attributes: attrs,
          level: currentLevel + 1,
          children: []
        };
        
        // 根据缩进确定层级
        const expectedLevel = Math.floor(indent / 2) + currentLevel;
        
        while (nodeStack.length > expectedLevel) {
          nodeStack.pop();
        }
        
        if (nodeStack.length > 0) {
          const parent = nodeStack[nodeStack.length - 1];
          parent.children.push(node);
          nodeStack.push(node);
        }
      }
    }
    
    // 如果没有找到节点，创建一个默认的
    if (nodes.length === 0) {
      nodes.push({
        name: 'Mind Map',
        attributes: {},
        level: 1,
        children: []
      });
    }
    
    return {
      metadata: {
        title: metadata.title || 'Mind Map',
        author: metadata.author || 'Unknown',
        version: metadata.version || '1.0',
        theme: metadata.theme || 'modern',
        layout: metadata.layout || 'mindmap',
        backgroundColor: metadata.backgroundColor || '#FFFFFF',
        width: metadata.width || 1600,
        height: metadata.height || 1200,
        ...metadata
      },
      root: nodes[0] // 使用第一个节点作为根节点
    };
  }

  // 解析属性字符串
  parseAttributes(attrString) {
    if (!attrString) return {};
    
    const attributes = {};
    const pairs = attrString.split(',');
    
    pairs.forEach(pair => {
      const [key, value] = pair.split('=').map(s => s.trim());
      if (key && value) {
        attributes[key] = this.parseValue(value);
      }
    });
    
    return attributes;
  }

  // 解析属性值
  parseValue(value) {
    // 数字
    if (/^\d+$/.test(value)) return parseInt(value);
    // 浮点数
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
    // 百分比
    if (value.endsWith('%')) return value;
    // 布尔值
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    // 颜色值
    if (value.startsWith('#') && (value.length === 4 || value.length === 7)) return value;
    // 日期
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    // 移除引号
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    // 默认返回字符串
    return value;
  }

  // 生成带有连线的 HTML
  async generateHTML(mindMapData, outputPath) {
    const htmlContent = this.generateHTMLContent(mindMapData);
    await fs.writeFile(outputPath, htmlContent);
    return outputPath;
  }

  // 生成 HTML 内容
  generateHTMLContent(mindMapData) {
    const title = mindMapData.metadata.title;
    const dataJson = JSON.stringify(mindMapData, null, 2);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Mind Map</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            background: #f5f5f5;
            overflow: hidden;
            width: 100vw;
            height: 100vh;
        }
        
        .mindmap-container {
            background: white;
            width: 100%;
            height: 100%;
            position: relative;
            overflow: auto;
        }
        
        .mindmap-title {
            text-align: center;
            color: #333;
            padding: 20px;
            font-size: 28px;
            font-weight: bold;
            background: white;
            border-bottom: 1px solid #eee;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        
        .mindmap {
            position: relative;
            width: 100%;
            height: calc(100% - 80px);
            min-width: 100%;
            min-height: 100%;
            padding: 50px;
        }
        
        .node {
            position: absolute;
            padding: 12px 20px;
            border-radius: 8px;
            background: #fff;
            border: 2px solid #ddd;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            cursor: pointer;
            transition: all 0.3s ease;
            max-width: 250px;
            min-width: 120px;
            text-align: center;
            font-size: 14px;
            line-height: 1.4;
            z-index: 10;
            word-wrap: break-word;
        }
        
        .node:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
            z-index: 100;
        }
        
        .node-root {
            background: #4CAF50;
            color: white;
            border-color: #388E3C;
            font-size: 18px;
            font-weight: bold;
        }
        
        .node-level-2 {
            background: #2196F3;
            color: white;
            border-color: #1976D2;
        }
        
        .node-level-3 {
            background: #FFC107;
            color: #333;
            border-color: #FFA000;
        }
        
        .node-level-4 {
            background: #9C27B0;
            color: white;
            border-color: #7B1FA2;
        }
        
        .node-level-5 {
            background: #607D8B;
            color: white;
            border-color: #455A64;
        }
        
        .node-content {
            font-weight: bold;
        }
        
        .node-progress {
            display: block;
            margin-top: 5px;
            font-size: 12px;
            font-weight: normal;
        }
        
        .node-tooltip {
            display: none;
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 12px;
            white-space: nowrap;
            z-index: 1000;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            min-width: 150px;
        }
        
        .node-tooltip::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 6px solid transparent;
            border-top-color: rgba(0, 0, 0, 0.9);
        }
        
        .node-tooltip div {
            margin: 4px 0;
            line-height: 1.4;
            display: flex;
            justify-content: space-between;
        }
        
        .node-tooltip strong {
            margin-right: 8px;
            color: #FFD700;
        }
        
        .node:hover .node-tooltip {
            display: block;
        }
        
        .connection {
            position: absolute;
            background: #999;
            height: 2px;
            transform-origin: 0 0;
            z-index: 1;
        }
        
        .connector-dot {
            position: absolute;
            width: 6px;
            height: 6px;
            background: #999;
            border-radius: 50%;
            z-index: 5;
        }
        
        /* 进度条样式 */
        .progress-bar {
            width: 100%;
            height: 6px;
            background: #e0e0e0;
            border-radius: 3px;
            margin-top: 8px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4CAF50, #8BC34A);
            border-radius: 3px;
            transition: width 0.3s ease;
        }
    </style>
</head>
<body>
    <div class="mindmap-container">
        <h1 class="mindmap-title">${title}</h1>
        <div class="mindmap" id="mindmap"></div>
    </div>

    <script>
        // 思维导图数据
        const mindMapData = ${dataJson};
        
        // 计算节点的尺寸信息
        function calculateNodeLayout(node, level = 0) {
            if (!node.children || node.children.length === 0) {
                return {
                    width: 1,
                    height: 1,
                    totalLeaves: 1,
                    node: node
                };
            }
            
            let totalWidth = 0;
            let maxHeight = 0;
            let totalLeaves = 0;
            const childrenLayouts = [];
            
            for (const child of node.children) {
                const childLayout = calculateNodeLayout(child, level + 1);
                childrenLayouts.push(childLayout);
                totalWidth += childLayout.width;
                maxHeight = Math.max(maxHeight, childLayout.height);
                totalLeaves += childLayout.totalLeaves;
            }
            
            return {
                width: Math.max(1, totalWidth),
                height: maxHeight + 1,
                totalLeaves: totalLeaves,
                node: node,
                children: childrenLayouts
            };
        }
        
        // 计算节点位置（水平布局，父节点位于子节点中间）
        function calculateNodePositions(layout, startX, startY, level = 0) {
            const node = layout.node;
            const positions = [];
            
            // 当前节点的位置 - 确保父节点在子节点的中间
            const nodeX = startX;
            const nodeY = startY + (layout.totalLeaves * 60) / 2;
            
            const nodeInfo = {
                id: node.name + '-' + level + '-' + Math.random().toString(36).substr(2, 5),
                name: node.name,
                attributes: node.attributes || {},
                level: level,
                x: Math.max(0, nodeX), // 确保x坐标非负
                y: Math.max(0, nodeY), // 确保y坐标非负
                children: []
            };
            
            positions.push(nodeInfo);
            
            // 计算子节点位置
            if (layout.children && layout.children.length > 0) {
                let currentY = startY;
                
                for (const childLayout of layout.children) {
                    const childPositions = calculateNodePositions(
                        childLayout, 
                        startX + 250, // 水平间距
                        currentY,
                        level + 1
                    );
                    
                    // 添加连接关系
                    nodeInfo.children.push(childPositions[0]);
                    positions.push(...childPositions);
                    
                    // 更新Y坐标位置
                    currentY += childLayout.totalLeaves * 60;
                }
            }
            
            return positions;
        }
        
        // 格式化属性值显示
        function formatAttributeValue(key, value) {
            if (key === 'progress' && typeof value === 'number') {
                return value + '%';
            }
            if (key === 'icon') {
                return value;
            }
            if (typeof value === 'boolean') {
                return value ? '是' : '否';
            }
            return value;
        }
        
        // 生成属性提示框内容
        function generateTooltipContent(attributes) {
            if (Object.keys(attributes).length === 0) {
                return '';
            }
            
            let content = '';
            for (const [key, value] of Object.entries(attributes)) {
                if (value !== undefined && value !== null && value !== '') {
                    content += \`<div><strong>\${key}:</strong> <span>\${formatAttributeValue(key, value)}</span></div>\`;
                }
            }
            
            return \`<div class="node-tooltip">\${content}</div>\`;
        }
        
        // 生成进度条
        function generateProgressBar(progress) {
            if (progress === undefined || progress === null) return '';
            return \`
                <div class="progress-bar">
                    <div class="progress-fill" style="width: \${progress}%"></div>
                </div>
            \`;
        }
        
        // 渲染思维导图
        function renderMindMap() {
            const container = document.getElementById('mindmap');
            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;
            
            // 计算布局
            const rootLayout = calculateNodeLayout(mindMapData.root);
            
            // 计算根节点起始位置（垂直居中）
            const startY = Math.max(0, (containerHeight - rootLayout.totalLeaves * 60) / 2);
            const startX = 100;
            
            // 计算所有节点位置
            const allNodes = calculateNodePositions(rootLayout, startX, startY);
            
            // 清空容器
            container.innerHTML = '';
            
            // 收集所有连接线
            const connections = [];
            
            allNodes.forEach(node => {
                node.children.forEach(childNode => {
                    const child = allNodes.find(n => n.id === childNode.id);
                    if (child) {
                        connections.push({
                            from: { x: node.x, y: node.y },
                            to: { x: child.x, y: child.y }
                        });
                    }
                });
            });
            
            // 渲染连接线
            connections.forEach(conn => {
                const dx = conn.to.x - conn.from.x;
                const dy = conn.to.y - conn.from.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                
                const connection = document.createElement('div');
                connection.className = 'connection';
                connection.style.width = length + 'px';
                connection.style.left = conn.from.x + 'px';
                connection.style.top = conn.from.y + 'px';
                connection.style.transform = \`rotate(\${angle}deg)\`;
                
                container.appendChild(connection);
                
                // 添加连接点
                const dot = document.createElement('div');
                dot.className = 'connector-dot';
                dot.style.left = (conn.from.x - 3) + 'px';
                dot.style.top = (conn.from.y - 3) + 'px';
                container.appendChild(dot);
            });
            
            // 计算边界框，用于调整容器大小
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            
            allNodes.forEach(node => {
                minX = Math.min(minX, node.x);
                minY = Math.min(minY, node.y);
                maxX = Math.max(maxX, node.x);
                maxY = Math.max(maxY, node.y);
            });
            
            // 添加边界缓冲
            minX = Math.max(0, minX - 100);
            minY = Math.max(0, minY - 100);
            maxX += 200;
            maxY += 100;
            
            // 设置容器最小尺寸，确保所有内容可见
            container.style.minWidth = Math.max(containerWidth, maxX) + 'px';
            container.style.minHeight = Math.max(containerHeight, maxY) + 'px';
            
            // 渲染节点
            allNodes.forEach(node => {
                const nodeElement = document.createElement('div');
                nodeElement.className = \`node node-level-\${Math.min(node.level, 5)}\`;
                if (node.level === 0) {
                    nodeElement.classList.add('node-root');
                }
                
                nodeElement.style.left = (node.x - 60) + 'px';
                nodeElement.style.top = (node.y - 25) + 'px';
                
                // 生成节点内容
                const progressBar = generateProgressBar(node.attributes.progress);
                const tooltipContent = generateTooltipContent(node.attributes);
                
                nodeElement.innerHTML = \`
                    <div class="node-content">\${node.name}</div>
                    \${progressBar}
                    \${tooltipContent}
                \`;
                
                container.appendChild(nodeElement);
            });
            
            // 自动滚动到中心位置
            setTimeout(() => {
                container.scrollTo({
                    left: (maxX - containerWidth) / 2,
                    top: (maxY - containerHeight) / 2,
                    behavior: 'smooth'
                });
            }, 100);
        }
        
        // 页面加载完成后渲染
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(renderMindMap, 100);
        });
        
        // 窗口大小变化时重新渲染
        window.addEventListener('resize', function() {
            setTimeout(renderMindMap, 100);
        });
    </script>
</body>
</html>`;
  }

  // 生成 JSON 文件
  async generateJSON(mindMapData, outputPath) {
    await fs.writeJson(outputPath, mindMapData, { spaces: 2 });
    return outputPath;
  }

  // 主编译方法
  async compile(content, options = {}) {
    const {
      format = 'html',
      outputDir = './'
    } = options;
    
    // 解析 Flowmaid 内容
    const mindMapData = this.parseFlowmaid(content);
    
    const outputFiles = [];
    const baseName = mindMapData.metadata.title.replace(/\s+/g, '_').toLowerCase();
    
    // 根据格式生成输出文件
    switch (format.toLowerCase()) {
      case 'html':
        const htmlPath = path.join(outputDir, `${baseName}.html`);
        await this.generateHTML(mindMapData, htmlPath);
        outputFiles.push(htmlPath);
        break;
        
      case 'json':
        const jsonPath = path.join(outputDir, `${baseName}.json`);
        await this.generateJSON(mindMapData, jsonPath);
        outputFiles.push(jsonPath);
        break;
        
      default:
        throw new Error(`Unsupported format: ${format}. Supported formats: html, json`);
    }
    
    return {
      mindMapData,
      outputFiles
    };
  }
}

// 创建单例实例
const compiler = new FlowmaidCompiler();

// 导出编译函数
async function compileFlowmaid(content, options = {}) {
  return await compiler.compile(content, options);
}

module.exports = {
  FlowmaidCompiler,
  compileFlowmaid
};