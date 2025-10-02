const fs = require('fs');
const path = require('path');

class EJSON {
  /**
   * 读取并解析 JSON 文件
   */
  readJSONFile(filePath) {
    try {
      const resolvedPath = path.resolve(filePath);
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`文件不存在: ${filePath}`);
      }

      const fileContent = fs.readFileSync(resolvedPath, 'utf8');
      return JSON.parse(fileContent);
    } catch (error) {
      throw new Error(`无法解析 JSON 文件: ${error.message}`);
    }
  }

  /**
   * 解析并显示 JSON 文件
   */
  parseFile(file, indent = 2) {
    const jsonData = this.readJSONFile(file);
    console.log(JSON.stringify(jsonData, null, indent));
  }

  /**
   * 根据路径获取值
   */
  getValue(file, path, options = {}) {
    const jsonData = this.readJSONFile(file);
    const value = this.getValueByPath(jsonData, path);
    
    if (value === undefined) {
      if (options.defaultValue !== undefined) {
        console.log(options.defaultValue);
      } else {
        throw new Error(`路径 '${path}' 不存在`);
      }
    } else {
      if (options.raw) {
        console.log(value);
      } else {
        console.log(JSON.stringify(value, null, 2));
      }
    }
  }

  /**
   * 搜索键
   */
  searchKey(file, targetKey, targetValue = null) {
    const jsonData = this.readJSONFile(file);
    const results = this.searchKeyInObject(jsonData, targetKey, targetValue);
    
    if (results.length === 0) {
      console.log('未找到匹配的结果');
    } else {
      console.log(`找到 ${results.length} 个匹配结果:`);
      results.forEach((result, index) => {
        console.log(`${index + 1}. 路径: ${result.path}`);
        console.log(`   值: ${JSON.stringify(result.value, null, 2)}`);
        if (index < results.length - 1) console.log('---');
      });
    }
  }

  /**
   * 列出所有键
   */
  listKeys(file, all = false) {
    const jsonData = this.readJSONFile(file);
    let keys;
    
    if (all) {
      keys = this.getAllKeys(jsonData);
    } else {
      keys = Object.keys(jsonData);
    }
    
    console.log(`找到 ${keys.length} 个键:`);
    keys.forEach((key, index) => {
      console.log(`${index + 1}. ${key}`);
    });
  }

  /**
   * 验证 JSON 文件
   */
  validateFile(file) {
    this.readJSONFile(file);
    console.log('✅ JSON 文件格式正确');
  }

  /**
   * 获取统计信息
   */
  getStats(file) {
    const jsonData = this.readJSONFile(file);
    const stats = this.calculateStats(jsonData);
    
    console.log('📊 JSON 文件统计信息:');
    console.log(`   总键数: ${stats.totalKeys}`);
    console.log(`   嵌套深度: ${stats.depth}`);
    console.log(`   数组数量: ${stats.arrayCount}`);
    console.log(`   对象数量: ${stats.objectCount}`);
    console.log(`   字符串数量: ${stats.stringCount}`);
    console.log(`   数字数量: ${stats.numberCount}`);
    console.log(`   布尔值数量: ${stats.booleanCount}`);
    console.log(`   null 数量: ${stats.nullCount}`);
  }

  /**
   * 辅助函数：根据路径获取值
   */
  getValueByPath(obj, path) {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      // 处理数组索引
      if (key.includes('[') && key.includes(']')) {
        const arrayKey = key.split('[')[0];
        const index = parseInt(key.match(/\[(\d+)\]/)[1]);
        
        if (current[arrayKey] && Array.isArray(current[arrayKey])) {
          current = current[arrayKey][index];
        } else {
          return undefined;
        }
      } else {
        if (current === null || current === undefined || !current.hasOwnProperty(key)) {
          return undefined;
        }
        current = current[key];
      }
    }
    
    return current;
  }

  /**
   * 辅助函数：在对象中搜索键
   */
  searchKeyInObject(obj, targetKey, targetValue = null) {
    const results = [];
    
    const search = (current, currentPath = '') => {
      if (typeof current === 'object' && current !== null) {
        for (const [key, value] of Object.entries(current)) {
          const newPath = currentPath ? `${currentPath}.${key}` : key;
          
          // 检查键是否匹配
          if (key === targetKey) {
            // 如果指定了值，检查值是否匹配
            if (targetValue === null || String(value) === targetValue) {
              results.push({
                path: newPath,
                value: value
              });
            }
          }
          
          // 递归搜索嵌套对象和数组
          if (typeof value === 'object' && value !== null) {
            search(value, newPath);
          }
        }
      }
    };
    
    search(obj);
    return results;
  }

  /**
   * 辅助函数：获取所有键
   */
  getAllKeys(obj) {
    const keys = new Set();
    
    const collectKeys = (current) => {
      if (typeof current === 'object' && current !== null) {
        for (const [key, value] of Object.entries(current)) {
          keys.add(key);
          if (typeof value === 'object' && value !== null) {
            collectKeys(value);
          }
        }
      }
    };
    
    collectKeys(obj);
    return Array.from(keys);
  }

  /**
   * 辅助函数：计算统计信息
   */
  calculateStats(obj) {
    const stats = {
      totalKeys: 0,
      depth: 0,
      arrayCount: 0,
      objectCount: 0,
      stringCount: 0,
      numberCount: 0,
      booleanCount: 0,
      nullCount: 0
    };

    const traverse = (current, currentDepth = 0) => {
      stats.depth = Math.max(stats.depth, currentDepth);
      
      if (Array.isArray(current)) {
        stats.arrayCount++;
        current.forEach(item => {
          if (typeof item === 'object' && item !== null) {
            traverse(item, currentDepth + 1);
          } else {
            this.countPrimitive(item, stats);
          }
        });
      } else if (typeof current === 'object' && current !== null) {
        stats.objectCount++;
        stats.totalKeys += Object.keys(current).length;
        
        for (const value of Object.values(current)) {
          if (typeof value === 'object' && value !== null) {
            traverse(value, currentDepth + 1);
          } else {
            this.countPrimitive(value, stats);
          }
        }
      } else {
        this.countPrimitive(current, stats);
      }
    };

    traverse(obj);
    return stats;
  }

  /**
   * 辅助函数：统计基本类型
   */
  countPrimitive(value, stats) {
    switch (typeof value) {
      case 'string':
        stats.stringCount++;
        break;
      case 'number':
        stats.numberCount++;
        break;
      case 'boolean':
        stats.booleanCount++;
        break;
      case 'object':
        if (value === null) stats.nullCount++;
        break;
    }
  }
}

// 导出单例实例
module.exports = new EJSON();