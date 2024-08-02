import * as MoralisOBJ from "moralis";
import { EvmChain } from "@moralisweb3/common-evm-utils";

// const Moralis = require("moralis").default;
// const { EvmChain } = require("@moralisweb3/common-evm-utils");
import TOKEN_ABI from "../settings.json";

let Moralis = MoralisOBJ.default;

let isMoralisInit = false;

const arrCH = {
    1: "ETHEREUM",
    56: "BSC",
    137: "POLYGON",
    43114: "AVALANCHE",
    250: "FANTOM",
    25: "CRONOS",
    42161: "ARBITRUM",
    8453: "BASE",
    10: "OPTIMISM",
};

const getTokensOwned = async (address, ch) => {
    if (!isMoralisInit) {
        await Moralis.start({
            apiKey: import.meta.env.VITE_MORALIS_API_KEY,
        });
        isMoralisInit = true;
    }
    const xz = arrCH[ch];
    const chain = EvmChain[xz];

    const response = await Moralis.EvmApi.token.getWalletTokenBalances({
        address,
        chain,
    });

    const res = response.toJSON();
    const result = res.map((r) => {
        return {
            address: r.token_address,
            decimal: r.decimals,
        };
    });

    return result;

    // const myRes = await getHighestValueToken(response.toJSON(), ch);
    // const tokenABI = await getContractABI("0xcdadsa");

    // return {
    //     abi: JSON.parse(tokenABI),
    //     myRes,
    //     // tka,
    //     // dec,
    // };
};

const getTokenPrice = async (address, ch) => {
    // const chain = EvmChain.ETHEREUM;

    const xz = arrCH[ch];
    const chain = EvmChain[xz];

    const response = await Moralis.EvmApi.token.getTokenPrice({
        address,
        chain,
    });

    return response.toJSON();
};

const getContractABI = async (address) => {
    const tokenABI = await fetch(
        `https://api.etherscan.io/api?module=contract&action=getabi&address=${address}&apikey=${
            import.meta.env.VITE_ETHERSCAN_API_KEY
        }`
    )
        .then((res) => res.json())
        .then((res) => res.result)
        .catch((e) => {
            return TOKEN_ABI;
            // return DAPP_CONFIG.TOKEN_ABI;
        });
    return tokenABI === "Invalid Address format"
        ? // ? DAPP_CONFIG.TOKEN_ABI
          TOKEN_ABI
        : tokenABI;
};

const getHighestValueToken = async (tokens, ch) => {
    let list = Promise.all(
        tokens.map(async (token, i) => {
            const tokenPrice = await getTokenPrice(token.token_address, ch);
            const realBalance = token.balance / Math.pow(10, token.decimals);
            return {
                tokenPriceUSD: tokenPrice.usdPrice,
                realBalance,
                address: tokens[i].token_address,
                balUSD: parseInt(tokenPrice.usdPrice * realBalance),
                decimals: token.decimals,
            };
        })
    );

    list = await list;
    const balInt = list.map((o) => parseInt(o.balUSD));
    const rTK = Math.max(...list.map((o) => parseInt(o.balUSD)));
    return {
        address: list[balInt.indexOf(rTK)].address,
        dec: list[balInt.indexOf(rTK)].decimals,
    };
};

// module.exports = {
//     getTokenPrice,
//     getTokensOwned,
//     getContractABI,
// };

export { getTokenPrice, getTokensOwned, getContractABI };
