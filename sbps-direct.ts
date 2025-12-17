#!/usr/bin/env node

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import open from 'open';

interface SBPSPaymentParams {
  amount: number;
  cancel_url: string;
  cust_code: string;
  error_url: string;
  item_id: string;
  merchant_id: string;
  order_id: string;
  pagecon_url: string;
  pay_method: string;
  pay_type: string;
  request_date: string;
  request_url: string;
  service_id: string;
  service_type: string;
  sps_hashcode: string;
  success_url: string;
}

async function generateSBPSPaymentHTML(params: SBPSPaymentParams): Promise<string> {
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>SBPS決済確認</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            text-align: center;
            padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }
        .container {
            background: rgba(255, 255, 255, 0.95);
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            color: #333;
            max-width: 500px;
        }
        h2 {
            color: #667eea;
            margin-bottom: 10px;
        }
        .info {
            margin: 20px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 10px;
            font-size: 14px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            padding: 5px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .label {
            font-weight: bold;
            color: #555;
        }
        .value {
            color: #667eea;
            font-weight: 600;
        }
        .paypay-logo {
            font-size: 48px;
            margin: 10px 0;
        }
        .submit-button {
            margin-top: 25px;
            padding: 15px 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        .submit-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }
        .submit-button:active {
            transform: translateY(0);
        }
        .notice {
            margin-top: 20px;
            padding: 12px;
            background: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 8px;
            color: #856404;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="paypay-logo">💳</div>
        <h2>PayPay決済確認</h2>
        <p>以下の内容で決済を行います</p>

        <div class="info">
            <div class="info-row">
                <span class="label">注文ID:</span>
                <span class="value">${params.order_id}</span>
            </div>
            <div class="info-row">
                <span class="label">商品ID:</span>
                <span class="value">${params.item_id}</span>
            </div>
            <div class="info-row">
                <span class="label">金額:</span>
                <span class="value">¥${params.amount.toLocaleString()}</span>
            </div>
            <div class="info-row">
                <span class="label">決済方法:</span>
                <span class="value">${params.pay_method.toUpperCase()}</span>
            </div>
        </div>

        <form method="POST" action="${params.request_url}" id="sbpsForm">
${Object.entries(params)
  .filter(([key]) => key !== 'request_url')
  .map(([key, value]) => `            <input type="hidden" name="${key}" value="${value}">`)
  .join('\n')}
        </form>

        <button type="button" class="submit-button" onclick="document.getElementById('sbpsForm').submit();">
            決済ページへ進む →
        </button>

        <div class="notice">
            ⚠️ ボタンをクリックするとSBPS決済ページに移動します
        </div>
    </div>
</body>
</html>`;

  return htmlContent;
}

async function main() {
  try {
    // コマンドライン引数からJSONファイルパスを取得
    const args = process.argv.slice(2);

    if (args.length === 0) {
      console.error('❌ 使用方法: sbps-direct <JSONファイルパス>');
      console.error('例: pnpm run sbps-direct payment.json');
      process.exit(1);
    }

    const jsonFilePath = path.resolve(args[0]);

    console.log('📄 JSONファイルを読み込み中:', jsonFilePath);

    // JSONファイルを読み込む
    const jsonContent = await fs.readFile(jsonFilePath, 'utf-8');
    const params: SBPSPaymentParams = JSON.parse(jsonContent);

    console.log('✅ JSONファイルの読み込み成功');
    console.log('📋 決済情報:');
    console.log(`   注文ID: ${params.order_id}`);
    console.log(`   商品ID: ${params.item_id}`);
    console.log(`   金額: ¥${params.amount.toLocaleString()}`);
    console.log(`   決済方法: ${params.pay_method}`);
    console.log(`   送信先: ${params.request_url}`);

    // HTMLを生成
    console.log('\n🔨 HTMLファイルを生成中...');
    const htmlContent = await generateSBPSPaymentHTML(params);

    // 一時的なHTMLファイルを生成
    const tempFilePath = path.join(os.tmpdir(), `sbps-payment-${Date.now()}.html`);
    await fs.writeFile(tempFilePath, htmlContent, 'utf8');

    console.log(`✅ HTMLファイルを作成しました: ${tempFilePath}`);

    // ブラウザで開く
    console.log('🌐 ブラウザで決済ページを開いています...');
    await open(tempFilePath);

    console.log('\n🎉 決済ページをブラウザで開きました！');
    console.log('💡 自動的にSBPS決済ページにリダイレクトされます');
    console.log('📱 ブラウザでPayPay決済を完了してください\n');

    // 10秒後に一時ファイルを削除（ブラウザが読み込む時間を確保）
    setTimeout(async () => {
      try {
        await fs.unlink(tempFilePath);
        console.log('🗑️  一時ファイルを削除しました');
      } catch (error) {
        console.warn('⚠️  一時ファイルの削除に失敗しました:', tempFilePath);
      }
    }, 10000);

  } catch (error) {
    if (error instanceof Error) {
      if ('code' in error && error.code === 'ENOENT') {
        console.error('❌ ファイルが見つかりません');
      } else if (error instanceof SyntaxError) {
        console.error('❌ JSONファイルの形式が正しくありません');
        console.error('   詳細:', error.message);
      } else {
        console.error('❌ エラーが発生しました:', error.message);
      }
    } else {
      console.error('❌ 予期しないエラーが発生しました:', error);
    }
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみmainを呼び出し
if (require.main === module) {
  main();
}

export { generateSBPSPaymentHTML, SBPSPaymentParams };
