import { ok, badRequest } from 'wix-http-functions';
import wixPaymentProviderBackend from "wix-payment-provider-backend";
import crypto from "crypto";
import { secrets } from "wix-secrets-backend.v2";
import { elevate } from "wix-auth";

// Endpoint for receiving updates about transactions.
export async function post_updateTransaction(request) {
  const response = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const sigHashAlg = 'sha256';
  const sigHeaderName = 'sbp-sig';

  const elevatedGetSecretValue = elevate(secrets.getSecretValue);
  const hmacSecret = await elevatedGetSecretValue("sbp_hmacSecret");

  const sig = Buffer.from(request.headers[sigHeaderName]);

  const hmac = crypto.createHmac(sigHashAlg, hmacSecret.value);
  const rawBody = await request.body.text();

  const digest = Buffer.from(
      sigHashAlg + '=' + hmac.update(rawBody).digest('hex'),
      'utf8'
  );

  // @ts-ignore
  const checksum = Buffer.from(sig, 'utf8');

  if (
      checksum.length !== digest.length ||
      !crypto.timingSafeEqual(digest, checksum)
  ) {
        console.log(
          "Swiss Bitcoin Pay callback: Request body digest (" + digest + ") did not match " + sigHeaderName + " (" + checksum + ")"
      );
      return badRequest(response);
  }

  const transactionRequestBody = await request.body.json();

  // Validate the request content.
  if (transactionRequestBody.status === "settled") {
    // Update the transaction status on your site. This code assumes that the Wix
    // transaction ID and the payment provider's transaction ID are included in
    // the URL as query parameters.
    await wixPaymentProviderBackend.submitEvent({
      event: {
        transaction: {
          wixTransactionId: transactionRequestBody.extra["wixTransactionId"],
          pluginTransactionId: transactionRequestBody.id,
        },
      },
    });
  } else if (transactionRequestBody.status === "expired") {
    await wixPaymentProviderBackend.submitEvent({
      event: {
        transaction: {
          wixTransactionId: transactionRequestBody.extra["wixTransactionId"],
          pluginTransactionId: transactionRequestBody.id,
          reasonCode: 3035,
          errorCode: "INVOICE_EXPIRED",
          errorMessage: "Invoice expired"
        },
      },
    });
  }
  
  return ok(response);
}