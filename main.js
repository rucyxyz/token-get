const axios = require('axios');
const readline = require('readline');
const childProcess = require('child_process');
const chalk = require('chalk');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let accounts = [];
let saveToFile = false;

rl.question(chalk.cyan('トークンをファイルに保存しますか？(y/n): '), (answer) => {
  if (answer.toLowerCase() === 'y') {
    saveToFile = true;
  }
  function askNumAccounts() {
    rl.question('何個取得しますか？: ', (num) => {
      const numAccounts = parseInt(num);
      if (isNaN(numAccounts)) {
        console.log(chalk.red('数字を入力して下さい'));
        askNumAccounts();
      } else {
        function askAccountInfo(index) {
          if (index < numAccounts) {
            rl.question(`アカウント${index + 1}個目のメールアドレスを入力して下さい: `, (email) => {
              if (email.trim() === '') {
                console.log(chalk.red('メールアドレスの入力は必須'));
                askAccountInfo(index);
                return;
              }
              rl.question(`アカウント${index + 1}個目のパスワードを入力して下さい: `, (password) => {
                if (password.trim() === '') {
                  console.log(chalk.red('パスワードの入力は必須'));
                  askAccountInfo(index);
                  return;
                }
                accounts.push({ email, password });
                askAccountInfo(index + 1);
              });
            });
          } else {
            rl.close();
            getTokens(accounts);
          }
        }

        askAccountInfo(0);
      }
    });
  }

  askNumAccounts();
});

async function getTokens(accounts) {
  const promises = accounts.map(account => axios.post('https://discord.com/api/v9/auth/login', {
    email: account.email,
    password: account.password,
  }));

  try {
    const responses = await Promise.all(promises);
    responses.forEach((response, index) => {
      console.log(`"${accounts[index].email}"のtokenは"${response.data.token}"`);
      if (saveToFile) {
        const data = `${accounts[index].email}:${response.data.token}\n`;
        fs.appendFile('tokens.txt', data, (err) => {
          if (err) {
            console.error(err);
          }
        });
      }
    });
  } catch (errors) {
    if (errors.response && errors.response.status === 400) {
      console.log(chalk.red('メールアドレスもしくはパスワードが間違っています'));
      console.log(chalk.cyan('エンターを押すと最初からやり直せます'));
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.question('', () => {
        console.clear();
        childProcess.execSync('node ' + process.argv[1], { stdio: 'inherit' });
        process.exit();
        
      });
    } else {
      console.error('tokenが取得できませんでした\n:', errors);
    }
  }
}
