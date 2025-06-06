const crypto = require('crypto');
import { fetch } from 'wix-fetch';
import { elevate } from "wix-auth";
import { site } from "wix-urls.v2";
import { secrets } from "wix-secrets-backend.v2";

const myElevatedListPublishedSiteUrls = elevate(site.listPublishedSiteUrls);
const sigHashAlg = 'sha256';

const signData = (requestData, hmacSecret) => {
    const hmac = crypto.createHmac(sigHashAlg, hmacSecret);
    const hex = hmac.update(requestData).digest('hex');

    return hex;
};

const API_URL = "https://api.swiss-bitcoin-pay.ch";

/**
 * This payment plugin endpoint is triggered when a merchant provides required data to connect their PSP account to a Wix site.
 * The plugin has to verify merchant's credentials, and ensure the merchant has an operational PSP account.
 */
export const connectAccount = async (options) => {
    const body = JSON.stringify({ test: true });

    const result = await fetch(API_URL + "/hmac-check", {
        'method': 'post',
        'headers': {
            'Content-Type': 'application/json',
            "api-key": options.credentials.apiKey,
            "sbp-sig": "sha256=" + signData(body, options.credentials.hmacSecret)
        },
        'body': body
    });

    const SECRET_NAME = "sbp_hmacSecret";

    const secret = {
        name: SECRET_NAME,
        description: "SBP HMAC Secret",
        value: options.credentials.hmacSecret,
    };

    const HMAC_SECRET = (await secrets.listSecretInfo()).secrets.find((e) => e.name === SECRET_NAME);

    if (!HMAC_SECRET) {
        await secrets.createSecret(secret);
    } else {
        await secrets.updateSecret(HMAC_SECRET._id, secret);
    }

    return {
        credentials: {
            apiKey: options.credentials.apiKey,
            hmacSecret: options.credentials.hmacSecret,
        },
        accountName: (await result.json()).accountName
    };
};

/**
 * This payment plugin endpoint is triggered when a buyer pays on a Wix site.
 * The plugin has to process this payment request but prevent double payments for the same "wixTransactionId".
 */
export const createTransaction = async (options, context) => {
    const publishedSiteUrl = await myElevatedListPublishedSiteUrls({});

    const siteUrl = publishedSiteUrl.urls.find(u => u.primary).url;
    const webhookUrl = siteUrl + "/_functions/updateTransaction/";

    const { currency, totalAmount, items } = options.order.description;
    const digits = CURRENCY_DIGITS[currency] + 1;

    const divider = parseInt("1".padEnd(digits, 0));
    const amount = totalAmount / divider;

    const body = JSON.stringify({
        amount,
        unit: currency,
        title: "Wix Order " + options.order._id,
        redirectAfterPaid: options.order.returnUrls.successUrl,
        delay: 60,
        onChain: true,
        webhook: {
            url: webhookUrl
        },
        invoiceData: {
            items: items.map((item) => ({
                name: item.name,
                quantity: item.quantity,
                unitPriceWithVat: parseFloat(item.price) / divider
            }))
        },
        extra: {
            wixTransactionId: options.wixTransactionId
        }
    });

    const result = await fetch(API_URL + "/checkout", {
        'method': 'post',
        'headers': {
            'Content-Type': 'application/json',
            "api-key": options.merchantCredentials.apiKey,
            "sbp-sig": "sha256=" + signData(body, options.merchantCredentials.hmacSecret)
        },
        'body': body
    });

    const data = await result.json();

    return {
        pluginTransactionId: data.id,
        redirectUrl: data.checkoutUrl
    };
};

/**
 * This payment plugin endpoint is triggered when a merchant refunds a payment made on a Wix site.
 * The plugin has to process this refund request but prevent double refunds for the same "wixRefundId".
 */
export const refundTransaction = async (options, context) => {
    return {
        "pluginRefundId": options.pluginTransactionId,
        "reasonCode": 404,
        "errorCode": "REFUND_NOT_SUPPORTED",
        "errorMessage": "Refund not supported"
    }
};

const CURRENCY_DIGITS = {
    AED: 2,
    AFN: 2,
    ALL: 2,
    AMD: 2,
    ANG: 2,
    AOA: 2,
    ARS: 2,
    AUD: 2,
    AWG: 2,
    AZN: 2,
    BAM: 2,
    BBD: 2,
    BDT: 2,
    BGN: 2,
    BHD: 3,
    BIF: 0,
    BMD: 2,
    BND: 2,
    BOB: 2,
    BRL: 2,
    BSD: 2,
    BTN: 2,
    BWP: 2,
    BYN: 2,
    BZD: 2,
    CAD: 2,
    CDF: 2,
    CHF: 2,
    CLP: 0,
    CNY: 2,
    COP: 2,
    CRC: 2,
    CUP: 2,
    CVE: 2,
    CZK: 2,
    DJF: 0,
    DKK: 2,
    DOP: 2,
    DZD: 2,
    EGP: 2,
    ERN: 2,
    ETB: 2,
    EUR: 2,
    FJD: 2,
    FKP: 2,
    FOK: 2,
    GBP: 2,
    GEL: 2,
    GGP: 2,
    GHS: 2,
    GIP: 2,
    GMD: 2,
    GNF: 0,
    GTQ: 2,
    GYD: 2,
    HKD: 2,
    HNL: 2,
    HRK: 2,
    HTG: 2,
    HUF: 2,
    IDR: 2,
    ILS: 2,
    IMP: 2,
    INR: 2,
    IQD: 3,
    IRR: 2,
    ISK: 0,
    JEP: 2,
    JMD: 2,
    JOD: 3,
    JPY: 0,
    KES: 2,
    KGS: 2,
    KHR: 2,
    KID: 2,
    KMF: 0,
    KRW: 0,
    KWD: 3,
    KYD: 2,
    KZT: 2,
    LAK: 2,
    LBP: 2,
    LKR: 2,
    LRD: 2,
    LSL: 2,
    LYD: 3,
    MAD: 2,
    MDL: 2,
    MGA: 2,
    MKD: 2,
    MMK: 2,
    MNT: 2,
    MOP: 2,
    MRU: 2,
    MUR: 2,
    MVR: 2,
    MWK: 2,
    MXN: 2,
    MYR: 2,
    MZN: 2,
    NAD: 2,
    NGN: 2,
    NIO: 2,
    NOK: 2,
    NPR: 2,
    NZD: 2,
    OMR: 3,
    PAB: 2,
    PEN: 2,
    PGK: 2,
    PHP: 2,
    PKR: 2,
    PLN: 2,
    PYG: 0,
    QAR: 2,
    RON: 2,
    RSD: 2,
    RUB: 2,
    RWF: 0,
    SAR: 2,
    SBD: 2,
    SCR: 2,
    SDG: 2,
    SEK: 2,
    SGD: 2,
    SHP: 2,
    SLE: 2,
    SLL: 2,
    SOS: 2,
    SRD: 2,
    SSP: 2,
    STN: 2,
    SYP: 2,
    SZL: 2,
    THB: 2,
    TJS: 2,
    TMT: 2,
    TND: 3,
    TOP: 2,
    TRY: 2,
    TTD: 2,
    TVD: 2,
    TWD: 2,
    TZS: 2,
    UAH: 2,
    UGX: 0,
    USD: 2,
    UYU: 2,
    UZS: 2,
    VES: 2,
    VND: 0,
    VUV: 0,
    WST: 2,
    XAF: 0,
    XCD: 2,
    XOF: 0,
    XPF: 0,
    YER: 2,
    ZAR: 2,
    ZMW: 2,
    ZWL: 2
};