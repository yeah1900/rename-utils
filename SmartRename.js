const path = require('path');
const fs = require('fs');

const ENV = {
    DRY_RUN_FLAG: process.env.DRY_RUN !== undefined ? process.env.DRY_RUN : true
};

const TARGET_PATTERN = new RegExp('^\\d{4}-\\d{2}-\\d{2} \\d{2}.\\d{2}.\\d{2}\.(mp4|jpg|heic|png)$');
const FILE_MATCHERS = [
    {type: 'regex', pattern: '^B612咔叽_(\\d{4})(\\d{2})(\\d{2})_(\\d{2})(\\d{2})(\\d{2})\.(mp4|jpg)$'},
    {type: 'regex', pattern: '^IMG_(\\d{4})(\\d{2})(\\d{2})_(\\d{2})(\\d{2})(\\d{2})\.(mp4|jpg)$'},
    {type: 'regex', pattern: '^VID_(\\d{4})(\\d{2})(\\d{2})_(\\d{2})(\\d{2})(\\d{2})\.(mp4|jpg)$'},
    {type: 'regex', pattern: '^(\\d{4})-(\\d{2})-(\\d{2}) (\\d{2})(\\d{2})(\\d{2})\.(mp4|jpg|heic|png)$'},
    {type: 'timestamp', pattern: '^mmexport(\\d{13})\.(mp4|jpg|jpeg)$'},
    {type: 'timestamp', pattern: '^microMsg.(\\d{13})\.(mp4|jpg|jpeg)$'},
    {type: 'timestamp', pattern: '^wx_camera_(\\d{13})\.(mp4|jpg)$'},
    {type: 'timestamp', pattern: '^(\\d{13})\.(mp4|jpg)$'},
    {type: 'birthtime', pattern: '^QQ视频_.{32}\.(mp4)$'},
    {type: 'birthtime', pattern: '^null\-?.{15,16}\.(jpg)$'}
];

const to2Digits = number => {
    if (number < 10 && number >= 0) {
        return '0' + number;
    }
    return number;
};

const normalize = (name, fullName) => {
    let normalizedName = null;

    FILE_MATCHERS.some(matcher => {
        if (matcher.type === 'regex') {
            const matchResult = new RegExp(matcher.pattern).exec(name);

            if (matchResult) {
                let [, year, month, day, hour, min, sec, ext] = matchResult;
                normalizedName = `${year}-${month}-${day} ${hour}.${min}.${sec}.${ext}`;
                return true;
            }
        } else if (matcher.type === 'timestamp') {
            const matchResult = new RegExp(matcher.pattern).exec(name);

            if (matchResult) {
                const [, millis, ext] = matchResult;
                const date = new Date(+millis);
                const year = date.getFullYear();
                const month = to2Digits(date.getMonth() + 1);
                const day = to2Digits(date.getDate());
                const hour = to2Digits(date.getHours());
                const min = to2Digits(date.getMinutes());
                const sec = to2Digits(date.getSeconds());
                normalizedName = `${year}-${month}-${day} ${hour}.${min}.${sec}.${ext}`;
                return true;
            }
        } else if (matcher.type === 'birthtime') {
            const matchResult = new RegExp(matcher.pattern).exec(name);

            if (matchResult) {
                const [,ext] = matchResult;
                const createdDate = fs.statSync(fullName).birthtime;
                const year = createdDate.getFullYear();
                const month = to2Digits(createdDate.getMonth() + 1);
                const day = to2Digits(createdDate.getDate());
                const hour = to2Digits(createdDate.getHours());
                const min = to2Digits(createdDate.getMinutes());
                const sec = to2Digits(createdDate.getSeconds());
                normalizedName = `${year}-${month}-${day} ${hour}.${min}.${sec}.${ext}`;
            }
        }
        return false;
    });
    
    return normalizedName;
};

const renameFile = (folder, name, stats) => {
    stats.total++;
    if (!TARGET_PATTERN.test(name)) {
        const from = path.resolve(folder, name);
        const normalizedName = normalize(name, from);

        if (normalizedName) {
            const to = path.resolve(folder, normalizedName);
            console.log('renaming ', from, ' to ', to);
            stats.renamed++;
            if (ENV.DRY_RUN_FLAG === 'false') {
                fs.renameSync(from, to);
                console.log('rename completed');
            }
        } else {
            console.log('skipping ', name);
            stats.unprocessed++;
        }
    }
};

const renameFilesInFolder = folder => {
    const stats = {
        folder,
        total: 0,
        renamed: 0,
        unprocessed: 0
    };
    const files = fs.readdirSync(folder).toString().split(',');
    files.filter(f => !!f).forEach(file => {
        const fileStats = fs.statSync(path.resolve(folder, file));
        if (fileStats.isFile()) {
            renameFile(folder, file, stats);
        } else if (fileStats.isDirectory()) {
            renameFilesInFolder(path.resolve(folder, file));
        }
    });
    summary.push(stats);
};

// Execution
const summary = [];
const folders = process.argv.slice(2);
folders.map(folder => {
    renameFilesInFolder(path.resolve(folder));
});
console.log(summary);

// TODO:
// 1. rollback feature - record name mappings
// 2. replace console.log with nice logger
// 3. support more file patterns
// 4. birthtime