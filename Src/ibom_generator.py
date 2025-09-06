#!/usr/bin/env python3
"""
iBOM生成器 - 将PCB设计文件和BOM转换为在线交互式BOM
支持多种EDA工具：KiCad, Altium, Eagle, OrCAD等
"""

import os
import sys
import json
import argparse
import shutil
import tempfile
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET
import pandas as pd

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("请安装BeautifulSoup库: pip install beautifulsoup4")
    sys.exit(1)

class IBomGenerator:
    def __init__(self):
        self.template_dir = Path(__file__).parent / "templates" / "ibom"
        self.output_dir = Path.cwd()
        self.supported_edas = ["kicad", "altium", "eagle", "orcad", "gerber"]
        
    def generate_ibom(self, input_path, bom_file=None, output_name="ibom", eda_type="auto"):
        """生成交互式BOM"""
        try:
            # 创建输出目录
            output_path = self.output_dir / output_name
            output_path.mkdir(exist_ok=True)
            
            # 复制模板文件
            self._copy_template_files(output_path)
            
            # 检测EDA类型
            if eda_type == "auto":
                eda_type = self._detect_eda_type(input_path)
                print(f"检测到EDA类型: {eda_type}")
            
            # 处理设计文件
            pcb_data = self._process_design_files(input_path, eda_type, output_path)
            
            # 处理BOM文件
            bom_data = []
            if bom_file:
                bom_data = self._process_bom_file(bom_file, eda_type)
            elif eda_type == "kicad":
                # 尝试从KiCad项目中提取BOM
                bom_data = self._extract_kicad_bom(input_path)
            
            # 生成配置文件
            self._generate_config(output_path, pcb_data, bom_data, eda_type)
            
            print(f"交互式BOM已生成到: {output_path}")
            print(f"请在浏览器中打开: {output_path}/index.html")
            
            return True
            
        except Exception as e:
            print(f"生成iBOM时出错: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
    
    def _detect_eda_type(self, input_path):
        """自动检测EDA工具类型"""
        path = Path(input_path)
        
        # 检查KiCad项目
        if path.is_dir():
            kicad_files = list(path.glob("*.kicad_pcb")) + list(path.glob("*.pro"))
            if kicad_files:
                return "kicad"
        
        # 检查Altium项目
        if path.is_dir():
            altium_files = list(path.glob("*.PcbDoc")) + list(path.glob("*.SchDoc"))
            if altium_files:
                return "altium"
        
        # 检查Eagle项目
        if path.is_dir():
            eagle_files = list(path.glob("*.sch")) + list(path.glob("*.brd"))
            if eagle_files:
                return "eagle"
        
        # 检查Gerber文件
        if path.is_dir():
            gerber_files = list(path.glob("*.gbr")) + list(path.glob("*.gm1")) + list(path.glob("*.gtl")) + list(path.glob("*.gbl"))
            if gerber_files:
                return "gerber"
        elif path.suffix.lower() in [".zip", ".gz"]:
            # 可能是Gerber压缩包
            return "gerber"
        
        # 默认返回Gerber
        return "gerber"
    
    def _copy_template_files(self, output_path):
        """复制模板文件到输出目录"""
        if not self.template_dir.exists():
            self._create_default_template()
        
        # 复制所有模板文件
        for item in self.template_dir.iterdir():
            if item.is_file():
                shutil.copy2(item, output_path / item.name)
            else:
                shutil.copytree(item, output_path / item.name, dirs_exist_ok=True)
    
    def _create_default_template(self):
        """创建默认的iBOM模板"""
        self.template_dir.mkdir(parents=True, exist_ok=True)
        
        # 创建HTML模板
        html_content = '''
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>交互式BOM - {project_name}</title>
            <link rel="stylesheet" href="css/ibom.css">
            <script src="js/three.min.js"></script>
            <script src="js/gerber-to-svg.js"></script>
            <script src="js/ibom.js"></script>
        </head>
        <body>
            <div id="header">
                <h1>{project_name} - 交互式BOM</h1>
                <div id="controls">
                    <button id="toggle-top-layer">显示/隐藏顶层</button>
                    <button id="toggle-bottom-layer">显示/隐藏底层</button>
                    <button id="toggle-silkscreen">显示/隐藏丝印</button>
                    <button id="search-btn">搜索元件</button>
                    <input type="text" id="search-input" placeholder="搜索元件...">
                    <select id="layer-select">
                        <option value="all">所有层</option>
                        <option value="top">顶层</option>
                        <option value="bottom">底层</option>
                    </select>
                </div>
            </div>
            
            <div id="container">
                <div id="pcb-viewer">
                    <div id="pcb-canvas"></div>
                    <div id="pcb-info">
                        <h3>PCB信息</h3>
                        <p>尺寸: {pcb_width} x {pcb_height} mm</p>
                        <p>层数: {layer_count}</p>
                        <p>元件数量: {component_count}</p>
                    </div>
                </div>
                <div id="bom-panel">
                    <h2>物料清单</h2>
                    <div id="bom-controls">
                        <button id="export-bom">导出BOM</button>
                        <button id="filter-bom">筛选</button>
                    </div>
                    <table id="bom-table">
                        <thead>
                            <tr>
                                <th>位号</th>
                                <th>型号</th>
                                <th>数值</th>
                                <th>封装</th>
                                <th>数量</th>
                                <th>层</th>
                                <th>X</th>
                                <th>Y</th>
                                <th>旋转</th>
                            </tr>
                        </thead>
                        <tbody id="bom-body"></tbody>
                    </table>
                </div>
            </div>
            
            <script>
                document.addEventListener('DOMContentLoaded', function() {
                    initIBom({
                        pcbData: {pcb_data},
                        bomData: {bom_data},
                        projectName: '{project_name}',
                        edaType: '{eda_type}'
                    });
                });
            </script>
        </body>
        </html>
        '''
        
        with open(self.template_dir / "index.html", "w", encoding="utf-8") as f:
            f.write(html_content)
        
        # 创建CSS文件
        css_dir = self.template_dir / "css"
        css_dir.mkdir(exist_ok=True)
        
        css_content = '''
        /* iBOM样式 */
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
            color: #333;
        }
        
        #header {
            background: linear-gradient(135deg, #2c3e50, #4a6491);
            color: white;
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        #header h1 {
            margin: 0;
            font-size: 1.5em;
        }
        
        #controls {
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
        }
        
        #controls button, #controls select, #controls input {
            padding: 8px 12px;
            border: none;
            border-radius: 4px;
            background-color: #fff;
            color: #333;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        #controls button:hover {
            background-color: #e9e9e9;
        }
        
        #controls input, #controls select {
            padding: 7px 10px;
        }
        
        #container {
            display: flex;
            height: calc(100vh - 70px);
        }
        
        #pcb-viewer {
            flex: 7;
            background-color: #fff;
            display: flex;
            flex-direction: column;
        }
        
        #pcb-canvas {
            flex: 1;
            background-color: #f0f0f0;
        }
        
        #pcb-info {
            padding: 10px;
            background-color: #f9f9f9;
            border-top: 1px solid #ddd;
        }
        
        #bom-panel {
            flex: 3;
            background-color: #fff;
            display: flex;
            flex-direction: column;
            border-left: 1px solid #ddd;
        }
        
        #bom-controls {
            padding: 10px;
            background-color: #f9f9f9;
            border-bottom: 1px solid #ddd;
            display: flex;
            gap: 10px;
        }
        
        #bom-table {
            width: 100%;
            border-collapse: collapse;
            flex: 1;
            overflow-y: auto;
        }
        
        #bom-table th, #bom-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            font-size: 0.9em;
        }
        
        #bom-table th {
            background-color: #f2f2f2;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        
        #bom-table tr:hover {
            background-color: #f5f5f5;
        }
        
        .component-highlight {
            stroke: #ff5722;
            stroke-width: 3;
            fill-opacity: 0.7;
        }
        
        .component-selected {
            stroke: #2196f3;
            stroke-width: 4;
            fill-opacity: 0.9;
        }
        
        @media (max-width: 1200px) {
            #container {
                flex-direction: column;
            }
            
            #bom-panel {
                border-left: none;
                border-top: 1px solid #ddd;
                height: 40%;
            }
        }
        '''
        
        with open(css_dir / "ibom.css", "w", encoding="utf-8") as f:
            f.write(css_content)
        
        # 创建JS目录和文件
        js_dir = self.template_dir / "js"
        js_dir.mkdir(exist_ok=True)
        
        # 这里简化了，实际需要更复杂的JavaScript代码
        js_content = '''
        // iBOM JavaScript逻辑
        function initIBom(config) {
            console.log("初始化交互式BOM", config);
            
            // 初始化Three.js场景
            initScene();
            
            // 加载PCB数据
            loadPcbData(config.pcbData);
            
            // 渲染BOM表格
            renderBomTable(config.bomData);
            
            // 设置事件监听器
            setupEventListeners();
        }
        
        function initScene() {
            // 初始化Three.js场景
            console.log("初始化3D场景");
        }
        
        function loadPcbData(pcbData) {
            // 加载PCB数据
            console.log("加载PCB数据", pcbData);
            
            // 更新PCB信息
            document.getElementById('pcb-info').innerHTML = `
                <h3>PCB信息</h3>
                <p>尺寸: ${pcbData.width || 'N/A'} x ${pcbData.height || 'N/A'} mm</p>
                <p>层数: ${pcbData.layers ? pcbData.layers.length : 0}</p>
                <p>元件数量: ${pcbData.components ? pcbData.components.length : 0}</p>
            `;
        }
        
        function renderBomTable(bomData) {
            const bomBody = document.getElementById('bom-body');
            bomBody.innerHTML = '';
            
            if (!bomData || bomData.length === 0) {
                bomBody.innerHTML = '<tr><td colspan="9" style="text-align: center;">没有BOM数据</td></tr>';
                return;
            }
            
            bomData.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.reference || ''}</td>
                    <td>${item.part_number || ''}</td>
                    <td>${item.value || ''}</td>
                    <td>${item.footprint || ''}</td>
                    <td>${item.quantity || 1}</td>
                    <td>${item.layer || ''}</td>
                    <td>${item.x || ''}</td>
                    <td>${item.y || ''}</td>
                    <td>${item.rotation || ''}</td>
                `;
                
                // 添加点击事件
                row.addEventListener('click', () => {
                    highlightComponent(item.reference);
                });
                
                bomBody.appendChild(row);
            });
        }
        
        function highlightComponent(reference) {
            console.log("高亮显示元件:", reference);
            // 实际实现中，这里应该高亮显示对应的PCB元件
        }
        
        function setupEventListeners() {
            // 搜索功能
            document.getElementById('search-btn').addEventListener('click', function() {
                const searchTerm = document.getElementById('search-input').value.toLowerCase();
                const rows = document.querySelectorAll('#bom-body tr');
                
                for (let row of rows) {
                    const text = row.textContent.toLowerCase();
                    row.style.display = text.includes(searchTerm) ? '' : 'none';
                }
            });
            
            // 层切换
            document.getElementById('layer-select').addEventListener('change', function() {
                const layer = this.value;
                console.log("切换层:", layer);
                // 实际实现中，这里应该切换显示的PCB层
            });
            
            // 导出BOM
            document.getElementById('export-bom').addEventListener('click', function() {
                exportBomToCsv();
            });
        }
        
        function exportBomToCsv() {
            console.log("导出BOM为CSV");
            // 实际实现中，这里应该将BOM数据导出为CSV文件
        }
        '''
        
        with open(js_dir / "ibom.js", "w", encoding="utf-8") as f:
            f.write(js_content)
    
    def _process_design_files(self, input_path, eda_type, output_path):
        """处理设计文件，提取PCB信息"""
        pcb_data = {
            "width": 100,
            "height": 100,
            "layers": [],
            "components": [],
            "outline": []
        }
        
        input_path = Path(input_path)
        
        if eda_type == "kicad":
            pcb_data = self._process_kicad_files(input_path, output_path)
        elif eda_type == "altium":
            pcb_data = self._process_altium_files(input_path, output_path)
        elif eda_type == "eagle":
            pcb_data = self._process_eagle_files(input_path, output_path)
        elif eda_type == "gerber":
            pcb_data = self._process_gerber_files(input_path, output_path)
        else:
            print(f"不支持的EDA类型: {eda_type}")
        
        return pcb_data
    
    def _process_kicad_files(self, input_path, output_path):
        """处理KiCad设计文件"""
        pcb_data = {
            "type": "kicad",
            "width": 100,
            "height": 100,
            "layers": [],
            "components": [],
            "outline": []
        }
        
        # 查找PCB文件
        pcb_files = list(input_path.glob("*.kicad_pcb"))
        if not pcb_files:
            print("未找到KiCad PCB文件")
            return pcb_data
        
        pcb_file = pcb_files[0]
        print(f"处理KiCad PCB文件: {pcb_file}")
        
        try:
            # 解析PCB文件
            tree = ET.parse(pcb_file)
            root = tree.getroot()
            
            # 提取板框信息
            for general in root.findall("general"):
                for size in general.findall("page"):
                    pcb_data["width"] = float(size.get("width", 100))
                    pcb_data["height"] = float(size.get("height", 100))
            
            # 提取层信息
            for layer in root.findall("layers"):
                for layer_info in layer.findall("layer"):
                    layer_data = {
                        "name": layer_info.get("name", ""),
                        "type": layer_info.get("type", ""),
                        "number": int(layer_info.get("number", 0))
                    }
                    pcb_data["layers"].append(layer_data)
            
            # 提取元件信息
            for module in root.findall("module"):
                comp_data = {
                    "reference": module.get("ref", ""),
                    "layer": module.get("layer", ""),
                    "x": float(module.get("x", 0)),
                    "y": float(module.get("y", 0)),
                    "rotation": float(module.get("rot", 0))
                }
                
                # 提取封装信息
                for property in module.findall("property"):
                    if property.get("name") == "Footprint":
                        comp_data["footprint"] = property.get("value", "")
                
                pcb_data["components"].append(comp_data)
            
            print(f"从KiCad文件中提取了 {len(pcb_data['components'])} 个元件")
            
        except Exception as e:
            print(f"解析KiCad文件时出错: {str(e)}")
        
        return pcb_data
    
    def _process_altium_files(self, input_path, output_path):
        """处理Altium设计文件"""
        pcb_data = {
            "type": "altium",
            "width": 100,
            "height": 100,
            "layers": [],
            "components": [],
            "outline": []
        }
        
        print("Altium设计文件处理功能尚未完全实现")
        # 这里需要实现Altium文件的解析逻辑
        
        return pcb_data
    
    def _process_eagle_files(self, input_path, output_path):
        """处理Eagle设计文件"""
        pcb_data = {
            "type": "eagle",
            "width": 100,
            "height": 100,
            "layers": [],
            "components": [],
            "outline": []
        }
        
        print("Eagle设计文件处理功能尚未完全实现")
        # 这里需要实现Eagle文件的解析逻辑
        
        return pcb_data
    
    def _process_gerber_files(self, input_path, output_path):
        """处理Gerber文件"""
        pcb_data = {
            "type": "gerber",
            "width": 100,
            "height": 100,
            "layers": [],
            "components": [],
            "outline": []
        }
        
        gerber_path = input_path
        
        # 如果是ZIP文件，先解压
        if input_path.is_file() and input_path.suffix.lower() in [".zip", ".gz"]:
            temp_dir = tempfile.mkdtemp()
            try:
                with zipfile.ZipFile(input_path, 'r') as zip_ref:
                    zip_ref.extractall(temp_dir)
                gerber_path = Path(temp_dir)
            except Exception as e:
                print(f"解压Gerber文件时出错: {str(e)}")
                return pcb_data
        
        # 识别和处理Gerber文件
        gerber_extensions = [".gbr", ".gm1", ".gm2", ".gtl", ".gbl", ".gts", ".gbs", ".gto", ".gbo", ".gko"]
        
        for ext in gerber_extensions:
            for file in gerber_path.glob(f"*{ext}"):
                layer_type = self._identify_gerber_layer(file.name)
                if layer_type:
                    layer_data = {
                        "name": file.name,
                        "type": layer_type,
                        "path": f"gerber/{file.name}"
                    }
                    pcb_data["layers"].append(layer_data)
                    
                    # 复制文件到输出目录
                    gerber_dir = output_path / "gerber"
                    gerber_dir.mkdir(exist_ok=True)
                    shutil.copy2(file, gerber_dir / file.name)
        
        print(f"处理了 {len(pcb_data['layers'])} 个Gerber层")
        
        return pcb_data
    
    def _identify_gerber_layer(self, filename):
        """识别Gerber文件类型"""
        filename = filename.lower()
        
        layer_map = {
            "gtl": "top_copper",
            "gbl": "bottom_copper",
            "gts": "top_solder_mask",
            "gbs": "bottom_solder_mask",
            "gto": "top_silkscreen",
            "gbo": "bottom_silkscreen",
            "gko": "outline",
            "gm1": "mechanical",
            "gm2": "mechanical",
            "gbr": "general"
        }
        
        for ext, layer_type in layer_map.items():
            if filename.endswith(ext):
                return layer_type
        
        return "unknown"
    
    def _process_bom_file(self, bom_file, eda_type):
        """处理BOM文件，提取元件信息"""
        bom_data = []
        bom_path = Path(bom_file)
        
        # 支持CSV、Excel和JSON格式的BOM
        if bom_path.suffix.lower() == '.csv':
            try:
                df = pd.read_csv(bom_path)
                for _, row in df.iterrows():
                    bom_data.append({
                        "reference": row.get("Reference", row.get("Designator", "")),
                        "part_number": row.get("Part Number", row.get("Value", "")),
                        "value": row.get("Value", row.get("Part Number", "")),
                        "footprint": row.get("Footprint", row.get("Package", "")),
                        "quantity": row.get("Quantity", 1),
                        "description": row.get("Description", "")
                    })
            except Exception as e:
                print(f"读取CSV BOM文件时出错: {str(e)}")
        
        elif bom_path.suffix.lower() in ['.xlsx', '.xls']:
            try:
                df = pd.read_excel(bom_path)
                for _, row in df.iterrows():
                    bom_data.append({
                        "reference": row.get("Reference", row.get("Designator", "")),
                        "part_number": row.get("Part Number", row.get("Value", "")),
                        "value": row.get("Value", row.get("Part Number", "")),
                        "footprint": row.get("Footprint", row.get("Package", "")),
                        "quantity": row.get("Quantity", 1),
                        "description": row.get("Description", "")
                    })
            except Exception as e:
                print(f"读取Excel BOM文件时出错: {str(e)}")
        
        elif bom_path.suffix.lower() == '.json':
            try:
                with open(bom_path, 'r', encoding='utf-8') as f:
                    bom_data = json.load(f)
            except Exception as e:
                print(f"读取JSON BOM文件时出错: {str(e)}")
        
        else:
            print(f"不支持的BOM文件格式: {bom_path.suffix}")
        
        print(f"从BOM文件中提取了 {len(bom_data)} 个元件")
        return bom_data
    
    def _extract_kicad_bom(self, input_path):
        """从KiCad项目中提取BOM信息"""
        bom_data = []
        
        # 查找网络表文件
        netlist_files = list(input_path.glob("*.net"))
        if not netlist_files:
            return bom_data
        
        netlist_file = netlist_files[0]
        print(f"从KiCad网络表提取BOM: {netlist_file}")
        
        try:
            # 解析网络表文件
            tree = ET.parse(netlist_file)
            root = tree.getroot()
            
            # 提取元件信息
            for comp in root.findall(".//comp"):
                comp_data = {
                    "reference": comp.get("ref", ""),
                    "value": "",
                    "footprint": "",
                    "quantity": 1
                }
                
                # 提取值和封装信息
                for field in comp.findall("value"):
                    comp_data["value"] = field.text
                
                for field in comp.findall("footprint"):
                    comp_data["footprint"] = field.text
                
                bom_data.append(comp_data)
            
            print(f"从KiCad网络表提取了 {len(bom_data)} 个元件")
            
        except Exception as e:
            print(f"解析KiCad网络表时出错: {str(e)}")
        
        return bom_data
    
    def _generate_config(self, output_path, pcb_data, bom_data, eda_type):
        """生成配置文件"""
        config = {
            "project": {
                "name": output_path.name,
                "date": pd.Timestamp.now().strftime("%Y-%m-%d"),
                "eda_type": eda_type
            },
            "pcb": pcb_data,
            "bom": bom_data
        }
        
        with open(output_path / "config.json", "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)

def main():
    """主函数，用于命令行调用"""
    parser = argparse.ArgumentParser(description="生成交互式BOM")
    parser.add_argument("input", help="输入文件或目录（PCB设计文件或Gerber文件）")
    parser.add_argument("-b", "--bom", help="BOM文件路径（可选）")
    parser.add_argument("-o", "--output", default="ibom", help="输出目录名称")
    parser.add_argument("-t", "--type", default="auto", 
                       choices=["auto", "kicad", "altium", "eagle", "orcad", "gerber"],
                       help="EDA工具类型")
    
    args = parser.parse_args()
    
    generator = IBomGenerator()
    success = generator.generate_ibom(args.input, args.bom, args.output, args.type)
    
    if success:
        print("iBOM生成成功!")
        return 0
    else:
        print("iBOM生成失败!")
        return 1

if __name__ == "__main__":
    sys.exit(main())#!/usr/bin/env python3
"""
iBOM生成器 - 将PCB设计文件和BOM转换为在线交互式BOM
支持多种EDA工具：KiCad, Altium, Eagle, OrCAD等
"""

import os
import sys
import json
import argparse
import shutil
import tempfile
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET
import pandas as pd

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("请安装BeautifulSoup库: pip install beautifulsoup4")
    sys.exit(1)

class IBomGenerator:
    def __init__(self):
        self.template_dir = Path(__file__).parent / "templates" / "ibom"
        self.output_dir = Path.cwd()
        self.supported_edas = ["kicad", "altium", "eagle", "orcad", "gerber"]
        
    def generate_ibom(self, input_path, bom_file=None, output_name="ibom", eda_type="auto"):
        """生成交互式BOM"""
        try:
            # 创建输出目录
            output_path = self.output_dir / output_name
            output_path.mkdir(exist_ok=True)
            
            # 复制模板文件
            self._copy_template_files(output_path)
            
            # 检测EDA类型
            if eda_type == "auto":
                eda_type = self._detect_eda_type(input_path)
                print(f"检测到EDA类型: {eda_type}")
            
            # 处理设计文件
            pcb_data = self._process_design_files(input_path, eda_type, output_path)
            
            # 处理BOM文件
            bom_data = []
            if bom_file:
                bom_data = self._process_bom_file(bom_file, eda_type)
            elif eda_type == "kicad":
                # 尝试从KiCad项目中提取BOM
                bom_data = self._extract_kicad_bom(input_path)
            
            # 生成配置文件
            self._generate_config(output_path, pcb_data, bom_data, eda_type)
            
            print(f"交互式BOM已生成到: {output_path}")
            print(f"请在浏览器中打开: {output_path}/index.html")
            
            return True
            
        except Exception as e:
            print(f"生成iBOM时出错: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
    
    def _detect_eda_type(self, input_path):
        """自动检测EDA工具类型"""
        path = Path(input_path)
        
        # 检查KiCad项目
        if path.is_dir():
            kicad_files = list(path.glob("*.kicad_pcb")) + list(path.glob("*.pro"))
            if kicad_files:
                return "kicad"
        
        # 检查Altium项目
        if path.is_dir():
            altium_files = list(path.glob("*.PcbDoc")) + list(path.glob("*.SchDoc"))
            if altium_files:
                return "altium"
        
        # 检查Eagle项目
        if path.is_dir():
            eagle_files = list(path.glob("*.sch")) + list(path.glob("*.brd"))
            if eagle_files:
                return "eagle"
        
        # 检查Gerber文件
        if path.is_dir():
            gerber_files = list(path.glob("*.gbr")) + list(path.glob("*.gm1")) + list(path.glob("*.gtl")) + list(path.glob("*.gbl"))
            if gerber_files:
                return "gerber"
        elif path.suffix.lower() in [".zip", ".gz"]:
            # 可能是Gerber压缩包
            return "gerber"
        
        # 默认返回Gerber
        return "gerber"
    
    def _copy_template_files(self, output_path):
        """复制模板文件到输出目录"""
        if not self.template_dir.exists():
            self._create_default_template()
        
        # 复制所有模板文件
        for item in self.template_dir.iterdir():
            if item.is_file():
                shutil.copy2(item, output_path / item.name)
            else:
                shutil.copytree(item, output_path / item.name, dirs_exist_ok=True)
    
    def _create_default_template(self):
        """创建默认的iBOM模板"""
        self.template_dir.mkdir(parents=True, exist_ok=True)
        
        # 创建HTML模板
        html_content = '''
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>交互式BOM - {project_name}</title>
            <link rel="stylesheet" href="css/ibom.css">
            <script src="js/three.min.js"></script>
            <script src="js/gerber-to-svg.js"></script>
            <script src="js/ibom.js"></script>
        </head>
        <body>
            <div id="header">
                <h1>{project_name} - 交互式BOM</h1>
                <div id="controls">
                    <button id="toggle-top-layer">显示/隐藏顶层</button>
                    <button id="toggle-bottom-layer">显示/隐藏底层</button>
                    <button id="toggle-silkscreen">显示/隐藏丝印</button>
                    <button id="search-btn">搜索元件</button>
                    <input type="text" id="search-input" placeholder="搜索元件...">
                    <select id="layer-select">
                        <option value="all">所有层</option>
                        <option value="top">顶层</option>
                        <option value="bottom">底层</option>
                    </select>
                </div>
            </div>
            
            <div id="container">
                <div id="pcb-viewer">
                    <div id="pcb-canvas"></div>
                    <div id="pcb-info">
                        <h3>PCB信息</h3>
                        <p>尺寸: {pcb_width} x {pcb_height} mm</p>
                        <p>层数: {layer_count}</p>
                        <p>元件数量: {component_count}</p>
                    </div>
                </div>
                <div id="bom-panel">
                    <h2>物料清单</h2>
                    <div id="bom-controls">
                        <button id="export-bom">导出BOM</button>
                        <button id="filter-bom">筛选</button>
                    </div>
                    <table id="bom-table">
                        <thead>
                            <tr>
                                <th>位号</th>
                                <th>型号</th>
                                <th>数值</th>
                                <th>封装</th>
                                <th>数量</th>
                                <th>层</th>
                                <th>X</th>
                                <th>Y</th>
                                <th>旋转</th>
                            </tr>
                        </thead>
                        <tbody id="bom-body"></tbody>
                    </table>
                </div>
            </div>
            
            <script>
                document.addEventListener('DOMContentLoaded', function() {
                    initIBom({
                        pcbData: {pcb_data},
                        bomData: {bom_data},
                        projectName: '{project_name}',
                        edaType: '{eda_type}'
                    });
                });
            </script>
        </body>
        </html>
        '''
        
        with open(self.template_dir / "index.html", "w", encoding="utf-8") as f:
            f.write(html_content)
        
        # 创建CSS文件
        css_dir = self.template_dir / "css"
        css_dir.mkdir(exist_ok=True)
        
        css_content = '''
        /* iBOM样式 */
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
            color: #333;
        }
        
        #header {
            background: linear-gradient(135deg, #2c3e50, #4a6491);
            color: white;
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        #header h1 {
            margin: 0;
            font-size: 1.5em;
        }
        
        #controls {
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
        }
        
        #controls button, #controls select, #controls input {
            padding: 8px 12px;
            border: none;
            border-radius: 4px;
            background-color: #fff;
            color: #333;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        #controls button:hover {
            background-color: #e9e9e9;
        }
        
        #controls input, #controls select {
            padding: 7px 10px;
        }
        
        #container {
            display: flex;
            height: calc(100vh - 70px);
        }
        
        #pcb-viewer {
            flex: 7;
            background-color: #fff;
            display: flex;
            flex-direction: column;
        }
        
        #pcb-canvas {
            flex: 1;
            background-color: #f0f0f0;
        }
        
        #pcb-info {
            padding: 10px;
            background-color: #f9f9f9;
            border-top: 1px solid #ddd;
        }
        
        #bom-panel {
            flex: 3;
            background-color: #fff;
            display: flex;
            flex-direction: column;
            border-left: 1px solid #ddd;
        }
        
        #bom-controls {
            padding: 10px;
            background-color: #f9f9f9;
            border-bottom: 1px solid #ddd;
            display: flex;
            gap: 10px;
        }
        
        #bom-table {
            width: 100%;
            border-collapse: collapse;
            flex: 1;
            overflow-y: auto;
        }
        
        #bom-table th, #bom-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            font-size: 0.9em;
        }
        
        #bom-table th {
            background-color: #f2f2f2;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        
        #bom-table tr:hover {
            background-color: #f5f5f5;
        }
        
        .component-highlight {
            stroke: #ff5722;
            stroke-width: 3;
            fill-opacity: 0.7;
        }
        
        .component-selected {
            stroke: #2196f3;
            stroke-width: 4;
            fill-opacity: 0.9;
        }
        
        @media (max-width: 1200px) {
            #container {
                flex-direction: column;
            }
            
            #bom-panel {
                border-left: none;
                border-top: 1px solid #ddd;
                height: 40%;
            }
        }
        '''
        
        with open(css_dir / "ibom.css", "w", encoding="utf-8") as f:
            f.write(css_content)
        
        # 创建JS目录和文件
        js_dir = self.template_dir / "js"
        js_dir.mkdir(exist_ok=True)
        
        # 这里简化了，实际需要更复杂的JavaScript代码
        js_content = '''
        // iBOM JavaScript逻辑
        function initIBom(config) {
            console.log("初始化交互式BOM", config);
            
            // 初始化Three.js场景
            initScene();
            
            // 加载PCB数据
            loadPcbData(config.pcbData);
            
            // 渲染BOM表格
            renderBomTable(config.bomData);
            
            // 设置事件监听器
            setupEventListeners();
        }
        
        function initScene() {
            // 初始化Three.js场景
            console.log("初始化3D场景");
        }
        
        function loadPcbData(pcbData) {
            // 加载PCB数据
            console.log("加载PCB数据", pcbData);
            
            // 更新PCB信息
            document.getElementById('pcb-info').innerHTML = `
                <h3>PCB信息</h3>
                <p>尺寸: ${pcbData.width || 'N/A'} x ${pcbData.height || 'N/A'} mm</p>
                <p>层数: ${pcbData.layers ? pcbData.layers.length : 0}</p>
                <p>元件数量: ${pcbData.components ? pcbData.components.length : 0}</p>
            `;
        }
        
        function renderBomTable(bomData) {
            const bomBody = document.getElementById('bom-body');
            bomBody.innerHTML = '';
            
            if (!bomData || bomData.length === 0) {
                bomBody.innerHTML = '<tr><td colspan="9" style="text-align: center;">没有BOM数据</td></tr>';
                return;
            }
            
            bomData.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.reference || ''}</td>
                    <td>${item.part_number || ''}</td>
                    <td>${item.value || ''}</td>
                    <td>${item.footprint || ''}</td>
                    <td>${item.quantity || 1}</td>
                    <td>${item.layer || ''}</td>
                    <td>${item.x || ''}</td>
                    <td>${item.y || ''}</td>
                    <td>${item.rotation || ''}</td>
                `;
                
                // 添加点击事件
                row.addEventListener('click', () => {
                    highlightComponent(item.reference);
                });
                
                bomBody.appendChild(row);
            });
        }
        
        function highlightComponent(reference) {
            console.log("高亮显示元件:", reference);
            // 实际实现中，这里应该高亮显示对应的PCB元件
        }
        
        function setupEventListeners() {
            // 搜索功能
            document.getElementById('search-btn').addEventListener('click', function() {
                const searchTerm = document.getElementById('search-input').value.toLowerCase();
                const rows = document.querySelectorAll('#bom-body tr');
                
                for (let row of rows) {
                    const text = row.textContent.toLowerCase();
                    row.style.display = text.includes(searchTerm) ? '' : 'none';
                }
            });
            
            // 层切换
            document.getElementById('layer-select').addEventListener('change', function() {
                const layer = this.value;
                console.log("切换层:", layer);
                // 实际实现中，这里应该切换显示的PCB层
            });
            
            // 导出BOM
            document.getElementById('export-bom').addEventListener('click', function() {
                exportBomToCsv();
            });
        }
        
        function exportBomToCsv() {
            console.log("导出BOM为CSV");
            // 实际实现中，这里应该将BOM数据导出为CSV文件
        }
        '''
        
        with open(js_dir / "ibom.js", "w", encoding="utf-8") as f:
            f.write(js_content)
    
    def _process_design_files(self, input_path, eda_type, output_path):
        """处理设计文件，提取PCB信息"""
        pcb_data = {
            "width": 100,
            "height": 100,
            "layers": [],
            "components": [],
            "outline": []
        }
        
        input_path = Path(input_path)
        
        if eda_type == "kicad":
            pcb_data = self._process_kicad_files(input_path, output_path)
        elif eda_type == "altium":
            pcb_data = self._process_altium_files(input_path, output_path)
        elif eda_type == "eagle":
            pcb_data = self._process_eagle_files(input_path, output_path)
        elif eda_type == "gerber":
            pcb_data = self._process_gerber_files(input_path, output_path)
        else:
            print(f"不支持的EDA类型: {eda_type}")
        
        return pcb_data
    
    def _process_kicad_files(self, input_path, output_path):
        """处理KiCad设计文件"""
        pcb_data = {
            "type": "kicad",
            "width": 100,
            "height": 100,
            "layers": [],
            "components": [],
            "outline": []
        }
        
        # 查找PCB文件
        pcb_files = list(input_path.glob("*.kicad_pcb"))
        if not pcb_files:
            print("未找到KiCad PCB文件")
            return pcb_data
        
        pcb_file = pcb_files[0]
        print(f"处理KiCad PCB文件: {pcb_file}")
        
        try:
            # 解析PCB文件
            tree = ET.parse(pcb_file)
            root = tree.getroot()
            
            # 提取板框信息
            for general in root.findall("general"):
                for size in general.findall("page"):
                    pcb_data["width"] = float(size.get("width", 100))
                    pcb_data["height"] = float(size.get("height", 100))
            
            # 提取层信息
            for layer in root.findall("layers"):
                for layer_info in layer.findall("layer"):
                    layer_data = {
                        "name": layer_info.get("name", ""),
                        "type": layer_info.get("type", ""),
                        "number": int(layer_info.get("number", 0))
                    }
                    pcb_data["layers"].append(layer_data)
            
            # 提取元件信息
            for module in root.findall("module"):
                comp_data = {
                    "reference": module.get("ref", ""),
                    "layer": module.get("layer", ""),
                    "x": float(module.get("x", 0)),
                    "y": float(module.get("y", 0)),
                    "rotation": float(module.get("rot", 0))
                }
                
                # 提取封装信息
                for property in module.findall("property"):
                    if property.get("name") == "Footprint":
                        comp_data["footprint"] = property.get("value", "")
                
                pcb_data["components"].append(comp_data)
            
            print(f"从KiCad文件中提取了 {len(pcb_data['components'])} 个元件")
            
        except Exception as e:
            print(f"解析KiCad文件时出错: {str(e)}")
        
        return pcb_data
    
    def _process_altium_files(self, input_path, output_path):
        """处理Altium设计文件"""
        pcb_data = {
            "type": "altium",
            "width": 100,
            "height": 100,
            "layers": [],
            "components": [],
            "outline": []
        }
        
        print("Altium设计文件处理功能尚未完全实现")
        # 这里需要实现Altium文件的解析逻辑
        
        return pcb_data
    
    def _process_eagle_files(self, input_path, output_path):
        """处理Eagle设计文件"""
        pcb_data = {
            "type": "eagle",
            "width": 100,
            "height": 100,
            "layers": [],
            "components": [],
            "outline": []
        }
        
        print("Eagle设计文件处理功能尚未完全实现")
        # 这里需要实现Eagle文件的解析逻辑
        
        return pcb_data
    
    def _process_gerber_files(self, input_path, output_path):
        """处理Gerber文件"""
        pcb_data = {
            "type": "gerber",
            "width": 100,
            "height": 100,
            "layers": [],
            "components": [],
            "outline": []
        }
        
        gerber_path = input_path
        
        # 如果是ZIP文件，先解压
        if input_path.is_file() and input_path.suffix.lower() in [".zip", ".gz"]:
            temp_dir = tempfile.mkdtemp()
            try:
                with zipfile.ZipFile(input_path, 'r') as zip_ref:
                    zip_ref.extractall(temp_dir)
                gerber_path = Path(temp_dir)
            except Exception as e:
                print(f"解压Gerber文件时出错: {str(e)}")
                return pcb_data
        
        # 识别和处理Gerber文件
        gerber_extensions = [".gbr", ".gm1", ".gm2", ".gtl", ".gbl", ".gts", ".gbs", ".gto", ".gbo", ".gko"]
        
        for ext in gerber_extensions:
            for file in gerber_path.glob(f"*{ext}"):
                layer_type = self._identify_gerber_layer(file.name)
                if layer_type:
                    layer_data = {
                        "name": file.name,
                        "type": layer_type,
                        "path": f"gerber/{file.name}"
                    }
                    pcb_data["layers"].append(layer_data)
                    
                    # 复制文件到输出目录
                    gerber_dir = output_path / "gerber"
                    gerber_dir.mkdir(exist_ok=True)
                    shutil.copy2(file, gerber_dir / file.name)
        
        print(f"处理了 {len(pcb_data['layers'])} 个Gerber层")
        
        return pcb_data
    
    def _identify_gerber_layer(self, filename):
        """识别Gerber文件类型"""
        filename = filename.lower()
        
        layer_map = {
            "gtl": "top_copper",
            "gbl": "bottom_copper",
            "gts": "top_solder_mask",
            "gbs": "bottom_solder_mask",
            "gto": "top_silkscreen",
            "gbo": "bottom_silkscreen",
            "gko": "outline",
            "gm1": "mechanical",
            "gm2": "mechanical",
            "gbr": "general"
        }
        
        for ext, layer_type in layer_map.items():
            if filename.endswith(ext):
                return layer_type
        
        return "unknown"
    
    def _process_bom_file(self, bom_file, eda_type):
        """处理BOM文件，提取元件信息"""
        bom_data = []
        bom_path = Path(bom_file)
        
        # 支持CSV、Excel和JSON格式的BOM
        if bom_path.suffix.lower() == '.csv':
            try:
                df = pd.read_csv(bom_path)
                for _, row in df.iterrows():
                    bom_data.append({
                        "reference": row.get("Reference", row.get("Designator", "")),
                        "part_number": row.get("Part Number", row.get("Value", "")),
                        "value": row.get("Value", row.get("Part Number", "")),
                        "footprint": row.get("Footprint", row.get("Package", "")),
                        "quantity": row.get("Quantity", 1),
                        "description": row.get("Description", "")
                    })
            except Exception as e:
                print(f"读取CSV BOM文件时出错: {str(e)}")
        
        elif bom_path.suffix.lower() in ['.xlsx', '.xls']:
            try:
                df = pd.read_excel(bom_path)
                for _, row in df.iterrows():
                    bom_data.append({
                        "reference": row.get("Reference", row.get("Designator", "")),
                        "part_number": row.get("Part Number", row.get("Value", "")),
                        "value": row.get("Value", row.get("Part Number", "")),
                        "footprint": row.get("Footprint", row.get("Package", "")),
                        "quantity": row.get("Quantity", 1),
                        "description": row.get("Description", "")
                    })
            except Exception as e:
                print(f"读取Excel BOM文件时出错: {str(e)}")
        
        elif bom_path.suffix.lower() == '.json':
            try:
                with open(bom_path, 'r', encoding='utf-8') as f:
                    bom_data = json.load(f)
            except Exception as e:
                print(f"读取JSON BOM文件时出错: {str(e)}")
        
        else:
            print(f"不支持的BOM文件格式: {bom_path.suffix}")
        
        print(f"从BOM文件中提取了 {len(bom_data)} 个元件")
        return bom_data
    
    def _extract_kicad_bom(self, input_path):
        """从KiCad项目中提取BOM信息"""
        bom_data = []
        
        # 查找网络表文件
        netlist_files = list(input_path.glob("*.net"))
        if not netlist_files:
            return bom_data
        
        netlist_file = netlist_files[0]
        print(f"从KiCad网络表提取BOM: {netlist_file}")
        
        try:
            # 解析网络表文件
            tree = ET.parse(netlist_file)
            root = tree.getroot()
            
            # 提取元件信息
            for comp in root.findall(".//comp"):
                comp_data = {
                    "reference": comp.get("ref", ""),
                    "value": "",
                    "footprint": "",
                    "quantity": 1
                }
                
                # 提取值和封装信息
                for field in comp.findall("value"):
                    comp_data["value"] = field.text
                
                for field in comp.findall("footprint"):
                    comp_data["footprint"] = field.text
                
                bom_data.append(comp_data)
            
            print(f"从KiCad网络表提取了 {len(bom_data)} 个元件")
            
        except Exception as e:
            print(f"解析KiCad网络表时出错: {str(e)}")
        
        return bom_data
    
    def _generate_config(self, output_path, pcb_data, bom_data, eda_type):
        """生成配置文件"""
        config = {
            "project": {
                "name": output_path.name,
                "date": pd.Timestamp.now().strftime("%Y-%m-%d"),
                "eda_type": eda_type
            },
            "pcb": pcb_data,
            "bom": bom_data
        }
        
        with open(output_path / "config.json", "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)

def main():
    """主函数，用于命令行调用"""
    parser = argparse.ArgumentParser(description="生成交互式BOM")
    parser.add_argument("input", help="输入文件或目录（PCB设计文件或Gerber文件）")
    parser.add_argument("-b", "--bom", help="BOM文件路径（可选）")
    parser.add_argument("-o", "--output", default="ibom", help="输出目录名称")
    parser.add_argument("-t", "--type", default="auto", 
                       choices=["auto", "kicad", "altium", "eagle", "orcad", "gerber"],
                       help="EDA工具类型")
    
    args = parser.parse_args()
    
    generator = IBomGenerator()
    success = generator.generate_ibom(args.input, args.bom, args.output, args.type)
    
    if success:
        print("iBOM生成成功!")
        return 0
    else:
        print("iBOM生成失败!")
        return 1

if __name__ == "__main__":
    sys.exit(main())