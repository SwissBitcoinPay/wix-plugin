export function getConfig() {
  const title = "Swiss Bitcoin Pay";

  const paymentMethods = [{
    hostedPage: {
      title: "Bitcoin (Onchain 🔗 & Lightning ⚡)",
      logos: {
        white: {
          svg: 'https://swiss-bitcoin-pay.ch/9dd7bb2f8b515309085a.svg',
          png: 'https://swiss-bitcoin-pay.ch/5fe5def1bdd06bcb66a0.png'
        },
        colored: {
          svg: 'https://swiss-bitcoin-pay.ch/48a2ed4d63697dd65b45.svg',
          png: "https://swiss-bitcoin-pay.ch/d6a3c5f7023ed0ff951c.png"
        }
      }
    }
  }];

  const credentialsFields = [{
    simpleField: {
      name: 'apiKey',
      label: 'API key'
    }
  }, 
  {
    simpleField: {
      name: 'hmacSecret',
      label: 'API secret'
    }
  },
  {
    checkboxField: {
      name: "onChain",
      label: "Allow Onchain payments",
      tooltip: "By checking this box, you're allowing clients to pay via Onchain"
    }
  }];

  return {
    title,
    paymentMethods,
    credentialsFields
  }
}