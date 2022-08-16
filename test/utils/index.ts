import { ethers } from "hardhat";
const { BigNumber } = require("ethers");

export const BASE_TEN = 10;
export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";
export const ADDRESS_ONE = "0x0000000000000000000000000000000000000001";
export const MAX_UINT = "115792089237316195423570985008687907853269984665640564039457584007913129639935"

export enum Roles {
    None,
    Summoner,
    VIP,
    PotatoPeeler,
    WoodSourcer,
    DJ,
    Valet,
    Entertainer,
    Firestarter,
    Grillmaster,
    Stowaway
}

export function encodeParameters(types, values) {
  const abi = new ethers.utils.AbiCoder();
  return abi.encode(types, values);
}

export async function prepare(thisObject, contracts) {
  for (let i in contracts) {
    let contract = contracts[i];
    thisObject[contract] = await ethers.getContractFactory(contract);
  }
}

export async function deploy(thisObject, contracts) {
  for (let i in contracts) {
    let contract = contracts[i];
    thisObject[contract[0]] = await contract[1].deploy(...(contract[2] || []));
    await thisObject[contract[0]].deployed();
  }
}

export async function createCLP(
  thisObject,
  name,
  tokenA,
  tokenB,
  amount,
  excluder = undefined
) {
  const createPairTx = await thisObject.factory.createPair(
    tokenA.address,
    tokenB.address
  );

  const _pair = (await createPairTx.wait()).events[0].args.pair;

  thisObject[name] = await thisObject.UniswapV2Pair.attach(_pair);

  if (excluder) {
    await thisObject.callback
      .connect(excluder)
      .exclude(thisObject[name].address, false);
  }

  await tokenA.transfer(thisObject[name].address, amount);
  await tokenB.transfer(thisObject[name].address, amount);

  await thisObject[name].mint(thisObject.deployer.address);
}
// Defaults to e18 using amount * 10^18
export function getBigNumber(amount, decimals = 18) {
  return BigNumber.from(amount).mul(BigNumber.from(BASE_TEN).pow(decimals));
}

export * from "./time";
