// /config/web3.ts
import { http, createConfig } from 'wagmi'
import { arbitrumSepolia } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'

export const config = createConfig({
  chains: [arbitrumSepolia],
  connectors: [injected(), metaMask()],
  transports: {
    [arbitrumSepolia.id]: http('https://sepolia-rollup.arbitrum.io/rpc'),
  },
})

// Contract addresses
export const CONTRACTS = {
  PREDICTION_MARKET: '0x759449068AD81E04FD223fe0F1Da790F17426204' as const,
  ORACLE_RESOLVER: '0xfE1757e4E3C6050d592b54A3060ED3A47eaCA898' as const,
  USDC_TOKEN: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as const,
}

// ✅ ABI must include everything your contract exposes
export const PREDICTION_MARKET_ABI = [
  {
    inputs: [],
    name: 'marketCounter',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'uint256' }],
    name: 'markets',
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'question', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'endTime', type: 'uint256' },
      { name: 'totalYesAmount', type: 'uint256' },
      { name: 'totalNoAmount', type: 'uint256' },
      { name: 'resolved', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: '_question', type: 'string' },
      { name: '_description', type: 'string' },
      { name: '_endTime', type: 'uint256' },
      { name: '_resolutionTime', type: 'uint256' },
      { name: '_oracle', type: 'address' },
    ],
    name: 'createMarket',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: '_marketId', type: 'uint256' },
      { name: '_outcome', type: 'uint8' },
      { name: '_amount', type: 'uint256' },
    ],
    name: 'placeBet',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: '_marketId', type: 'uint256' }],
    name: 'getMarket',
    outputs: [
      { name: 'question', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'endTime', type: 'uint256' },
      { name: 'resolutionTime', type: 'uint256' },
      { name: 'state', type: 'uint8' },
      { name: 'totalYesAmount', type: 'uint256' },
      { name: 'totalNoAmount', type: 'uint256' },
      { name: 'resolved', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: '_marketId', type: 'uint256' },
      { name: '_outcome', type: 'uint8' },
      { name: '_betAmount', type: 'uint256' },
    ],
    name: 'calculatePotentialWinnings',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '_marketId', type: 'uint256' }],
    name: 'claimWinnings',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

export const USDC_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const
