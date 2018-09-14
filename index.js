const path = require('path');
const fs = require('fs');

const ENV = {
    DRY_RUN_FLAG: true//!!process.ENV.DRY_RUN_FLAG
};

const TARGET_PATTERN = new RegExp('^\\d{4}-\\d{2}-\\d{2} \\d{2}.\\d{2}.\\d{2}.(mp4|jpg)$');
const FILE_MATCHERS = [
    {type: 'regex', pattern: '^B612咔叽_(\\d{4})(\\d{2})(\\d{2})_(\\d{2})(\\d{2})(\\d{2}).(mp4|jpg)$'},
    {type: 'regex', pattern: '^IMG_(\\d{4})(\\d{2})(\\d{2})_(\\d{2})(\\d{2})(\\d{2}).(mp4|jpg)$'},
    {type: 'regex', pattern: '^VID_(\\d{4})(\\d{2})(\\d{2})_(\\d{2})(\\d{2})(\\d{2}).(mp4|jpg)$'},
    {type: 'timestamp', pattern: '^mmexport(\\d{13}).(mp4|jpg)$'},
    {type: 'timestamp', pattern: '^wx_camera_(\\d{13}).(mp4|jpg)$'},
    {type: 'timestamp', pattern: '^(\\d{13}).(mp4|jpg)$'}
];

const to2Digits = number => {
    if (number < 10 && number >= 0) {
        return '0' + number;
    }
    return number;
};

const normalize = name => {
    let normalizedName = null;
    FILE_MATCHERS.some(matcher => {
        if (matcher.type === 'regexp') {
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
        }
        return false;
    });
    return normalizedName;
};

const renameFile = (folder, name, stats) => {
    stats.total++;
    if (!TARGET_PATTERN.test(name)) {
        const from = path.resolve(folder, name);
        const normalizedName = normalize(name);

        if (normalizedName) {
            const to = path.resolve(folder, normalize(name));
            console.log('renaming ', from, ' to ', to);
            stats.renamed++;
            if (!ENV.DRY_RUN_FLAG) {
                fs.renameSync(from, to);
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
    files.forEach(file => {
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
