#!/bin/bash
RPC_URL="https://rpc.toliman.suave.flashbots.net"
PRIVATE_KEY="91ab9a7e53c220e6210460b65a7a3bb2ca181412a8a7b43ff336b3df1737ce12"

address=$(forge create --json --rpc-url $RPC_URL --private-key $PRIVATE_KEY src/Counter.sol:Counter --legacy | jq .deployedTo | tr -d '"')

echo '{"address": "'$address'"}' > ./deployment.json
echo "deployed to $address"
