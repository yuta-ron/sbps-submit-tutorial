# SBPS 購入要求サンプルプログラム

SBペイメントサービス（SBPS）のリンク型決済における購入要求を送信するサンプルプログラムです。

参考: [SBPS 購入要求仕様](https://developer.sbpayment.jp/system-specifications/link-type/2517/)

## 環境構築

### 必要条件

- Node.js >= 16.0.0
- pnpm（推奨）または npm

### インストール

```bash
pnpm install
```

## payment.json の設定

決済パラメータは `payment.json` ファイルで管理します。実行前に、以下の項目を自分の環境に合わせて更新してください。

| パラメータ | 説明 |
|-----------|------|
| `merchant_id` | マーチャントID（SBPS管理画面で確認） |
| `service_id` | サービスID（SBPS管理画面で確認） |
| `order_id` | 注文ID（一意のID） |
| `item_id` | 商品ID |
| `amount` | 決済金額 |
| `cust_code` | 顧客コード |
| `pay_method` | 決済方法（例: `paypay`） |
| `request_date` | リクエスト日時（YYYYMMDDHHmmss形式） |
| `sps_hashcode` | ハッシュコード（SBPS仕様に従って生成） |
| `success_url` | 決済成功時のリダイレクトURL |
| `cancel_url` | 決済キャンセル時のリダイレクトURL |
| `error_url` | 決済エラー時のリダイレクトURL |
| `pagecon_url` | 結果通知URL |
| `request_url` | SBPS決済ゲートウェイURL |

### payment.json の例

```json
{
  "amount": 1000,
  "cancel_url": "http://localhost:18080/cancel",
  "cust_code": "customer_001",
  "error_url": "http://localhost:18080/error",
  "item_id": "item_001",
  "merchant_id": "YOUR_MERCHANT_ID",
  "order_id": "order_001",
  "pagecon_url": "https://your-server.com/callback",
  "pay_method": "paypay",
  "pay_type": "0",
  "request_date": "20251217100000",
  "request_url": "https://stbfep.sps-system.com/f01/FepBuyInfoReceive.do",
  "service_id": "YOUR_SERVICE_ID",
  "service_type": "0",
  "sps_hashcode": "YOUR_GENERATED_HASHCODE",
  "success_url": "http://localhost:18080/success"
}
```

## 動作確認方法

### 実行

```bash
pnpm run sbps:test
```

または、任意のJSONファイルを指定して実行:

```bash
pnpm run sbps payment.json
```

### 動作の流れ

1. コマンドを実行すると、`payment.json` の内容を読み込みます
2. 決済情報を表示した確認用HTMLページが生成されます
3. ブラウザが自動的に開きます
4. 「決済ページへ進む」ボタンをクリックすると、SBPSの決済ページへPOSTリクエストが送信されます
5. SBPS決済ページで決済を完了してください

## 注意事項

- `sps_hashcode` はSBPSの仕様に従って正しく生成する必要があります
- テスト環境と本番環境で `request_url` が異なります
  - テスト環境: `https://stbfep.sps-system.com/f01/FepBuyInfoReceive.do`
  - 本番環境: `https://fep.sps-system.com/f01/FepBuyInfoReceive.do`
- `order_id` は重複しないよう一意のIDを設定してください
