const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// 文件路径
const excelFilePath = path.join(__dirname, '..', 'gameinfo.xlsx');
const gameJsonPath = path.join(__dirname, '..', 'game.json');
const backupPath = path.join(__dirname, '..', 'game.json.bak');

/**
 * 备份原始的game.json文件
 */
function backupGameJson() {
    if (fs.existsSync(gameJsonPath)) {
        fs.copyFileSync(gameJsonPath, backupPath);
        console.log('✅ 已备份原始game.json文件到game.json.bak');
    }
}

/**
 * 读取Excel文件并转换为JSON数据
 */
function readExcelFile() {
    if (!fs.existsSync(excelFilePath)) {
        throw new Error('Excel文件不存在: ' + excelFilePath);
    }

    // 读取Excel文件
    const workbook = XLSX.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // 转换为JSON数组
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log(`✅ 成功读取Excel文件，共${data.length}行数据`);
    return data;
}

/**
 * 读取现有的game.json文件
 */
function readExistingGames() {
    if (!fs.existsSync(gameJsonPath)) {
        return [];
    }
    
    try {
        const content = fs.readFileSync(gameJsonPath, 'utf8');
        const games = JSON.parse(content);
        console.log(`✅ 读取现有游戏数据，共${games.length}个游戏`);
        return games;
    } catch (error) {
        console.error('读取game.json文件失败:', error);
        return [];
    }
}

/**
 * 将Excel数据转换为游戏对象格式
 */
function convertExcelDataToGames(excelData) {
    const games = [];
    
    // 跳过标题行，从第二行开始处理
    for (let i = 1; i < excelData.length; i++) {
        const row = excelData[i];
        
        // 检查行是否有数据
        if (!row || row.length === 0 || !row[0]) {
            console.log(`⚠️ 跳过第${i + 1}行：行为空`);
            continue;
        }
        
        try {
            // 每行的第一个单元格包含JSON字符串
            const jsonString = String(row[0]).trim();
            
            // 解析JSON字符串
            const gameArray = JSON.parse(jsonString);
            
            // 处理解析出的游戏数组
            if (Array.isArray(gameArray)) {
                gameArray.forEach((gameData, index) => {
                    try {
                        // 转换为我们需要的格式
                        const game = {
                            title: gameData.title || '',
                            embed: gameData.url || gameData.embed || '',
                            image: gameData.thumb || gameData.image || '',
                            tags: gameData.tags || '',
                            description: gameData.description || ''
                        };
                        
                        // 验证必要字段
                        if (!game.title || !game.embed) {
                            console.log(`⚠️ 跳过第${i + 1}行第${index + 1}个游戏：标题或嵌入链接为空`);
                            return;
                        }
                        
                        games.push(game);
                        console.log(`✅ 成功解析第${i + 1}行第${index + 1}个游戏："${game.title}"`);
                        
                    } catch (innerError) {
                        console.log(`⚠️ 跳过第${i + 1}行第${index + 1}个游戏：解析失败 - ${innerError.message}`);
                    }
                });
            } else {
                console.log(`⚠️ 跳过第${i + 1}行：不是数组格式`);
            }
            
        } catch (error) {
            console.log(`⚠️ 跳过第${i + 1}行：JSON解析失败 - ${error.message}`);
            continue;
        }
    }
    
    console.log(`✅ 转换完成，共处理了${games.length}个有效游戏`);
    return games;
}

/**
 * 检查游戏是否已存在（基于标题）
 */
function gameExists(existingGames, newGame) {
    return existingGames.some(game => 
        game.title.toLowerCase().trim() === newGame.title.toLowerCase().trim()
    );
}

/**
 * 合并新游戏到现有游戏列表
 */
function mergeGames(existingGames, newGames) {
    let addedCount = 0;
    let skippedCount = 0;
    
    newGames.forEach((newGame, index) => {
        if (gameExists(existingGames, newGame)) {
            console.log(`⚠️ 游戏已存在，跳过："${newGame.title}"`);
            skippedCount++;
        } else {
            existingGames.push(newGame);
            console.log(`✅ 添加新游戏："${newGame.title}"`);
            addedCount++;
        }
    });
    
    console.log(`\n📊 处理结果：`);
    console.log(`  - 新增游戏：${addedCount}个`);
    console.log(`  - 跳过重复：${skippedCount}个`);
    console.log(`  - 总游戏数：${existingGames.length}个`);
    
    return existingGames;
}

/**
 * 保存合并后的游戏数据
 */
function saveGames(games) {
    try {
        const jsonContent = JSON.stringify(games, null, 2);
        fs.writeFileSync(gameJsonPath, jsonContent, 'utf8');
        console.log('✅ 成功保存更新后的game.json文件');
    } catch (error) {
        console.error('保存文件失败:', error);
        throw error;
    }
}

/**
 * 主函数
 */
function main() {
    try {
        console.log('🚀 开始转换Excel数据到game.json...\n');
        
        // 1. 备份原始文件
        backupGameJson();
        
        // 2. 读取Excel文件
        const excelData = readExcelFile();
        
        // 3. 读取现有游戏数据
        const existingGames = readExistingGames();
        
        // 4. 转换Excel数据为游戏对象
        const newGames = convertExcelDataToGames(excelData);
        
        if (newGames.length === 0) {
            console.log('⚠️ 没有找到有效的游戏数据');
            return;
        }
        
        // 5. 合并游戏数据（去重）
        const mergedGames = mergeGames(existingGames, newGames);
        
        // 6. 保存合并后的数据
        saveGames(mergedGames);
        
        console.log('\n🎉 转换完成！');
        
    } catch (error) {
        console.error('❌ 转换过程中出现错误:', error.message);
        process.exit(1);
    }
}

// 运行主函数
if (require.main === module) {
    main();
}

module.exports = {
    main,
    readExcelFile,
    convertExcelDataToGames,
    mergeGames
}; 