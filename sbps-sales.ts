#!/usr/bin/env node

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import iconv from 'iconv-lite';
import axios from 'axios';

interface SalesPaymentParams {
  merchant_id: string;
  service_id: string;
  tracking_id: string;
  amount: string;
  order_description: string;
}

interface SbpsCredentials {
  basicAuthorizationId: string;
  basicAuthorizationPassword: string;
  hashKey: string;
}

const SBPS_API_URL = 'https://stbfep.sps-system.com/api/xmlapi.do';
const SALES_FUNCTION_ID = 'ST02-00201-311';
const LIMIT_SECOND = '30';

function getRequestDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

function generateHashcode(params: SalesPaymentParams, requestDate: string, hashKey: string): string {
  const hashInput = [
    params.merchant_id,
    params.service_id,
    params.tracking_id,
    params.amount,
    params.order_description,
    requestDate,
    LIMIT_SECOND,
    hashKey,
  ].join('');

  const shiftJisBuffer = iconv.encode(hashInput, 'Shift_JIS');
  const hash = crypto.createHash('sha1').update(shiftJisBuffer).digest('hex');
  return hash.toUpperCase();
}

function buildXmlRequest(
  params: SalesPaymentParams,
  requestDate: string,
  spsHashcode: string
): string {
  return `<?xml version="1.0" encoding="Shift_JIS"?>
<sps-api-request id="${SALES_FUNCTION_ID}">
  <merchant_id>${params.merchant_id}</merchant_id>
  <service_id>${params.service_id}</service_id>
  <tracking_id>${params.tracking_id}</tracking_id>
  <pay_option_manage>
    <amount>${params.amount}</amount>
    <order_description>${params.order_description}</order_description>
  </pay_option_manage>
  <request_date>${requestDate}</request_date>
  <limit_second>${LIMIT_SECOND}</limit_second>
  <sps_hashcode>${spsHashcode}</sps_hashcode>
</sps-api-request>`;
}

function loadCredentials(): SbpsCredentials {
  const basicAuthorizationId = process.env.SBPS_BASIC_AUTHORIZATION_ID;
  const basicAuthorizationPassword = process.env.SBPS_BASIC_AUTHORIZATION_PASSWORD;
  const hashKey = process.env.SBPS_HASH_KEY;

  if (!basicAuthorizationId || !basicAuthorizationPassword || !hashKey) {
    console.error('');
    console.error('  必要な環境変数が設定されていません。');
    console.error('  以下の環境変数を設定してください:');
    console.error('');
    console.error('  SBPS_BASIC_AUTHORIZATION_ID=xxx');
    console.error('  SBPS_BASIC_AUTHORIZATION_PASSWORD=yyy');
    console.error('  SBPS_HASH_KEY=zzz');
    console.error('');
    throw new Error('Missing required environment variables');
  }

  return {
    basicAuthorizationId,
    basicAuthorizationPassword,
    hashKey,
  };
}

async function main() {
  try {
    const args = process.argv.slice(2);

    if (args.length === 0) {
      console.error('  Usage: pnpm sbps:sales <JSONファイルパス>');
      console.error('  Example: pnpm sbps:sales sales_payment.json');
      process.exit(1);
    }

    const jsonFilePath = path.resolve(args[0]);

    console.log('  JSONファイルを読み込み中:', jsonFilePath);

    const jsonContent = await fs.readFile(jsonFilePath, 'utf-8');
    const params: SalesPaymentParams = JSON.parse(jsonContent);

    if (!params.tracking_id) {
      console.error('  tracking_id が未設定です');
      process.exit(1);
    }
    if (!params.amount) {
      console.error('  amount が未設定です');
      process.exit(1);
    }

    console.log('  JSONファイルの読み込み成功');
    console.log('  売上要求情報:');
    console.log(`     merchant_id: ${params.merchant_id}`);
    console.log(`     service_id: ${params.service_id}`);
    console.log(`     tracking_id: ${params.tracking_id}`);
    console.log(`     amount: ${params.amount}`);
    console.log(`     order_description: ${params.order_description || '(empty)'}`);

    console.log('\n  認証情報を読み込み中...');
    const credentials = loadCredentials();
    console.log('  認証情報の読み込み成功');

    const requestDate = getRequestDate();
    console.log(`\n  request_date: ${requestDate}`);

    const spsHashcode = generateHashcode(params, requestDate, credentials.hashKey);
    console.log(`  sps_hashcode: ${spsHashcode}`);

    const xmlRequest = buildXmlRequest(params, requestDate, spsHashcode);

    console.log('\n  XMLリクエスト:');
    console.log('  ' + '-'.repeat(60));
    console.log(xmlRequest.split('\n').map(line => '  ' + line).join('\n'));
    console.log('  ' + '-'.repeat(60));

    const basicAuth = Buffer.from(
      `${credentials.basicAuthorizationId}:${credentials.basicAuthorizationPassword}`
    ).toString('base64');

    console.log('\n  SBPSに売上要求を送信中...');
    console.log(`  URL: ${SBPS_API_URL}`);

    const xmlBuffer = iconv.encode(xmlRequest, 'Shift_JIS');

    const response = await axios.post(SBPS_API_URL, xmlBuffer, {
      headers: {
        'Content-Type': 'application/xml; charset=Shift_JIS',
        'Authorization': `BASIC ${basicAuth}`,
      },
      responseType: 'arraybuffer',
      validateStatus: () => true,
    });

    const responseText = iconv.decode(Buffer.from(response.data), 'Shift_JIS');

    console.log(`\n  HTTPステータス: ${response.status}`);
    console.log('  レスポンス:');
    console.log('  ' + '-'.repeat(60));
    console.log(responseText.split('\n').map(line => '  ' + line).join('\n'));
    console.log('  ' + '-'.repeat(60));

    if (responseText.includes('<res_result>OK</res_result>')) {
      console.log('\n  売上確定成功!');
    } else {
      const errCodeMatch = responseText.match(/<res_err_code>([^<]+)<\/res_err_code>/);
      if (errCodeMatch) {
        console.error(`\n  売上確定失敗: エラーコード ${errCodeMatch[1]}`);
      } else {
        console.error('\n  売上確定失敗');
      }
      process.exit(1);
    }

  } catch (error) {
    if (error instanceof Error) {
      console.error('  エラーが発生しました:', error.message);
    } else {
      console.error('  予期しないエラーが発生しました:', error);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { generateHashcode, buildXmlRequest, SalesPaymentParams };
