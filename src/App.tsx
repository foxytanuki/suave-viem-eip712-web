import { useEffect, useState } from "react";
import "./App.css";
import { ProviderMessage, custom, encodeAbiParameters, encodeFunctionData, hexToBigInt, zeroAddress } from '@flashbots/suave-viem'
import { getSuaveProvider, getSuaveWallet, type TransactionRequestSuave } from "@flashbots/suave-viem/chains/utils"
import { suaveToliman } from "@flashbots/suave-viem/chains"
import { Hex, http } from '@flashbots/suave-viem';
import deployment from "./contracts/deployment.json"

function App() {
  const [ethereum, setEthereum] = useState<any>()
  const [suaveProvider, setSuaveProvider] = useState<ReturnType<typeof getSuaveProvider>>()
  const [connected, setConnected] = useState(false)
  const [account, setAccount] = useState<Hex>()
  const [theNumber, setTheNumber] = useState<bigint>()
  const [theNumberInput, setTheNumberInput] = useState<number>()
  const [waitingForReceipt, setWaitingForReceipt] = useState(false)

  useEffect(() => {
    if (!suaveProvider) {
      setSuaveProvider(getSuaveProvider(http(suaveToliman.rpcUrls.default.http[0])))
    }
    if ("ethereum" in window && !ethereum) {
      setEthereum(window.ethereum)
    }
    if (ethereum && (!connected || !account)) {
      ethereum.request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setAccount(accounts[0] as Hex)
          } else {
            ethereum.request({
              "method": "wallet_requestPermissions",
              "params": [
                {
                  "eth_accounts": {}
                }
              ]
            }).then((result: any) => {
              console.log("result", result)
              if (result[0].parentCapability === "eth_accounts") {
                setConnected(true)
              }
            })
          }
        })
    }
    if (ethereum) {
      fetchNumber()
    }

  }, [ethereum, connected])

  const fetchNumber = async () => {
    const res = await suaveProvider.call({
      account: zeroAddress,
      data: "0x8381f58a",
      to: deployment.address,
    })
    setTheNumber(hexToBigInt(res.data))
  }

  const sendCCR = async () => {
    if (!account) {
      return
    }
    const nonce: number = await suaveProvider.getTransactionCount({ address: account, blockTag: "latest" })
    const tx: TransactionRequestSuave = {
      to: deployment.address as Hex,
      data: "0x4154b243" as Hex,
      confidentialInputs: encodeAbiParameters([{ type: "uint256" }], [BigInt(theNumberInput || 0)]),
      kettleAddress: "0xf579de142d98f8379c54105ac944fe133b7a17fe",
      type: "0x43",
      nonce,
      gas: 69000n,
      gasPrice: 10n * 10n ** 9n,
    }

    const wallet = getSuaveWallet({
      transport: custom(ethereum),
      jsonRpcAccount: account,
    })

    try {
      const signedTx = await wallet.signTransaction(tx)
      const txHash = await suaveProvider.sendRawTransaction({ serializedTransaction: signedTx })

      setWaitingForReceipt(true)
      const receipt = await suaveProvider.waitForTransactionReceipt({ hash: txHash })
      console.log("receipt", receipt)
      if (receipt.status === "success") {
        fetchNumber()
        setWaitingForReceipt(false)
      } else {
        alert("Transaction failed")
      }
    } catch (e) {
      console.error("error", e)
      alert(e)
      setWaitingForReceipt(false)
    }
  }

  return (
    <>
      <div className="card">
        <div>
          <input type="number" placeholder='Enter a number' style={{ padding: 10 }} onChange={(e) => setTheNumberInput(parseInt(e.target.value))} />
          <button onClick={sendCCR}>Update Number</button>
        </div>
        Connected with wallet <code>{account}</code>
      </div>
      <div style={{ margin: 240, padding: 32, background: "#fefefe3f" }}>
        <div>
          Contract Address: <code><a href={suaveToliman.blockExplorers.default.url + "/address/" + deployment.address} target="_blank">{deployment.address}</a></code>
          {theNumber ? <div style={{ display: "flex", flexDirection: "row", fontSize: 21 }}>Current Number:
            <div style={{ paddingLeft: 8 }}>{waitingForReceipt ? " loading..." : <code style={{ color: "#ff2", textShadow: "#777 1px 0 3px" }}>{theNumber.toString()}</code>}</div>
          </div> : null}
        </div>
      </div>
    </>
  );
}

export default App;
