const { FlowmaidCompiler } = require('./flowmaid'); // 假设编译器代码保存在这个文件

const compiler = new FlowmaidCompiler();

const content = `# 项目计划 [color=#4ECDC4, shape=ellipse, priority=high]

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
  backgroundColor: "#F8F9FA"`;

async function test() {
  try {
    const result = await compiler.compile(content, { format: 'json', outputPath: './' });
    console.log('编译成功，输出文件：', result.outputFiles);
    console.log('解析后的数据：', JSON.stringify(result.mindMapData, null, 2));
  } catch (error) {
    console.error('编译错误：', error);
  }
}

test();