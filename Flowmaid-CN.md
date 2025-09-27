# Flowmaid 语法规范

## 文件结构

```markdown
# 根节点标题 [属性键=属性值, 属性键2=属性值2]

## 二级节点 [属性]
  - 列表项1 [属性]
  - 列表项2 [属性]
    - 子列表项 [属性]

## 另一个二级节点
  - 其他内容

---
metadata:
  键: 值
  键2: 值2
```

## 标题语法

```markdown
# 一级标题 [属性]
## 二级标题 [属性]
### 三级标题 [属性]
#### 四级标题 [属性]
```

## 列表项语法

```markdown
- 普通列表项 [属性]
  - 缩进子项 [属性] (2个空格缩进)
    - 更深层子项 [属性] (4个空格缩进)
```

## 属性语法

- 格式：`[键=值, 键2=值2, 键3=值3]`
- 支持的数据类型：
  - 字符串：`text="字符串"` 或 `text=字符串` (无空格时可省略引号)
  - 数字：`progress=85`, `width=2000`
  - 布尔值：`completed=true`, `active=false`
  - 百分比：`completion=95%`
  - 日期：`date=2024-01-10`
  - 图标：`icon=🚀`, `icon=📝`

## 常用属性键值

### 通用属性

```markdown
[color=#FF6B6B, shape=ellipse, fontSize=28, icon=🚀]
```

- `color`: 节点颜色 (十六进制、颜色名称)
- `shape`: 节点形状 (`ellipse`, `rectangle`, `diamond`, `circle`)
- `fontSize`: 字体大小
- `icon`: 图标表情符号
- `priority`: 优先级 (`high`, `medium`, `low`)

### 进度相关

```markdown
[progress=75, assignee=张三, team=前端组]
```

- `progress`: 进度百分比 (0-100)
- `assignee`: 负责人
- `team`: 负责团队
- `status`: 状态 (`completed`, `in-progress`, `pending`)

### 数据相关

```markdown
[date=2024-01-20, participants=8, responses=150]
```

- `date`: 日期
- `participants`: 参与人数
- `responses`: 响应数量
- `competitors`: 竞品数量

### 技术相关

```markdown
[services=8, complexity=high, type=relational]
```

- `services`: 服务数量
- `complexity`: 复杂度 (`low`, `medium`, `high`)
- `type`: 类型描述
- `version`: 版本号

## 元数据区块

文件末尾的 YAML 格式元数据：

```markdown
---
metadata:
  title: "文档标题"
  author: "作者名称"
  version: "版本号"
  created: "创建日期"
  theme: "主题名称"
  layout: "布局类型"
  backgroundColor: "背景颜色"
  width: 画布宽度
  height: 画布高度
  description: "描述信息"
---
```

## 完整示例

```markdown
# 项目计划 [color=#4ECDC4, shape=ellipse, priority=high]

## 需求阶段 [progress=100]
  - 用户调研 [date=2024-01-10, participants=5]
  - 需求分析 [assignee=张三, status=completed]
    - 功能需求
    - 非功能需求

## 开发阶段 [progress=75, team=开发组]
  - 前端开发 [progress=80, assignee=李四]
  - 后端开发 [progress=70, assignee=王五]

## 测试阶段 [progress=30]
  - 单元测试 [testCases=50]
  - 集成测试 [scenarios=10]

---
metadata:
  title: "项目计划思维导图"
  author: "项目经理"
  version: "1.0"
  theme: "modern"
  layout: "mindmap"
  backgroundColor: "#F8F9FA"
```

## 语法规则

1. **缩进规则**: 使用空格缩进，每级缩进2个空格
2. **属性分隔**: 属性间用逗号分隔，等号两边不要有空格
3. **字符串引号**: 包含空格或特殊字符时建议使用引号
4. **注释支持**: 使用 `//` 进行单行注释
5. **空行忽略**: 空行会被解析器忽略

## 注意事项

- 确保属性键值对的正确格式
- 避免在节点文本中使用未转义的特殊字符
- 元数据区块必须放在文件末尾
- 保持一致的缩进风格