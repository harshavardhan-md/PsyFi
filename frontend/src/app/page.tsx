'use client'

import React, { useEffect, useState } from 'react'
import { useAccount, usePublicClient, useWriteContract } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { formatUnits, parseUnits } from 'viem'

// CONTRACT ADDRESSES
const CONTRACTS = {
  PREDICTION_MARKET: '0x759449068AD81E04FD223fe0F1Da790F17426204' as const,
  USDC_TOKEN: '0x75faf114eafb1BDbe2f0316DF893fd58CE46AA4d' as const,
}

// CORRECTED ABI - Using getMarket instead of direct markets mapping
const PREDICTION_MARKET_ABI = [
  {
    inputs: [],
    name: 'marketCounter',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
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
      { name: '_amount', type: 'uint256' },
    ],
    name: 'placeBet',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

const ERC20_ABI = [
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
] as const

const USDC_DECIMALS = 6

interface Market {
  id: number
  question: string
  description: string
  endTime: bigint
  resolutionTime: bigint
  state: number
  totalYesAmount: bigint
  totalNoAmount: bigint
  resolved: boolean
}

export default function Home() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { writeContract } = useWriteContract()
  const [markets, setMarkets] = useState<Market[]>([])
  const [selectedMarket, setSelectedMarket] = useState<number | null>(null)
  const [betAmount, setBetAmount] = useState('')
  const [outcome, setOutcome] = useState<0 | 1>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMarkets = async () => {
    if (!isConnected || !publicClient) return

    try {
      setError(null)
      console.log('Fetching markets...')

      // Get market count
      const marketCount = await publicClient.readContract({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'marketCounter',
      }) as bigint

      const count = Number(marketCount)
      console.log(`Found ${count} markets`)

      if (count === 0) {
        setMarkets([])
        return
      }

      const marketsData: Market[] = []

      // Use getMarket function instead of direct mapping access
      for (let i = 0; i < count; i++) {
        try {
          const marketData = await publicClient.readContract({
            address: CONTRACTS.PREDICTION_MARKET,
            abi: PREDICTION_MARKET_ABI,
            functionName: 'getMarket',
            args: [BigInt(i)],
          }) as [string, string, bigint, bigint, number, bigint, bigint, boolean]

          const market: Market = {
            id: i,
            question: marketData[0],
            description: marketData[1],
            endTime: marketData[2],
            resolutionTime: marketData[3],
            state: marketData[4],
            totalYesAmount: marketData[5],
            totalNoAmount: marketData[6],
            resolved: marketData[7],
          }

          marketsData.push(market)
          console.log(`Loaded market ${i}:`, market.question)
        } catch (err) {
          console.error(`Failed to fetch market ${i}:`, err)
        }
      }

      setMarkets(marketsData)
      console.log(`Successfully loaded ${marketsData.length} markets`)
    } catch (err) {
      console.error('Failed to fetch markets:', err)
      setError(`Failed to fetch markets: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  useEffect(() => {
    fetchMarkets()
  }, [isConnected, publicClient])

  const placeBet = async () => {
    if (selectedMarket === null || !betAmount || Number(betAmount) <= 0 || !writeContract) return
    
    setLoading(true)
    setError(null)

    try {
      const amount = parseUnits(betAmount, USDC_DECIMALS)

      // 1. Approve USDC spending
      await writeContract({
        address: CONTRACTS.USDC_TOKEN,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.PREDICTION_MARKET, amount],
      })

      // Wait a bit for approval to process
      await new Promise(resolve => setTimeout(resolve, 2000))

      // 2. Place bet
      await writeContract({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'placeBet',
        args: [BigInt(selectedMarket), outcome, amount],
      })

      // Refresh markets after betting
      setTimeout(() => {
        fetchMarkets()
      }, 3000)

      setBetAmount('')
      setSelectedMarket(null)
      
    } catch (err) {
      console.error('Betting failed:', err)
      setError(`Betting failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const calculateOdds = (yesAmount: bigint, noAmount: bigint, isYes: boolean) => {
    const total = yesAmount + noAmount
    if (total === 0n) return '0.50'
    const side = isYes ? yesAmount : noAmount
    const prob = Number(side) / Number(total)
    return prob.toFixed(2)
  }

  if (!isConnected) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">🎯 ArbiTruth</h1>
          <p className="text-xl text-white/80 mb-8">
            The First AI-Autonomous Prediction Market
          </p>
          <ConnectButton />
        </div>
      </main>
    )
  }

  const selectedMarketObj = selectedMarket !== null ? markets.find((m) => m.id === selectedMarket) ?? null : null

  return (
    <main className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Live Prediction Markets</h2>
        <p className="text-white/70">Bet on outcomes with instant resolution</p>
        
        <button
          onClick={fetchMarkets}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Refresh Markets
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
          <p className="text-red-200 font-semibold">Error:</p>
          <p className="text-red-100 text-sm">{error}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Markets List */}
        <div className="space-y-4">
          {markets.length === 0 ? (
            <div className="p-6 bg-white/10 rounded-lg border border-white/20 text-center">
              <p className="text-white/70">No markets available</p>
            </div>
          ) : (
            markets.map((market) => (
              <div
                key={market.id}
                className={`p-6 rounded-lg border transition-all cursor-pointer ${
                  selectedMarket === market.id
                    ? 'bg-white/20 border-white/30'
                    : 'bg-white/10 border-white/20 hover:bg-white/15'
                }`}
                onClick={() => setSelectedMarket(market.id)}
              >
                <h3 className="text-lg font-semibold text-white mb-2">{market.question}</h3>
                <p className="text-white/70 text-sm mb-4">{market.description}</p>

                <div className="flex justify-between items-center">
                  <div className="flex gap-4">
                    <div className="text-center">
                      <div className="text-green-400 font-bold">
                        {calculateOdds(market.totalYesAmount, market.totalNoAmount, true)}
                      </div>
                      <div className="text-xs text-white/70">YES</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-400 font-bold">
                        {calculateOdds(market.totalYesAmount, market.totalNoAmount, false)}
                      </div>
                      <div className="text-xs text-white/70">NO</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-white font-semibold">
                      ${formatUnits(market.totalYesAmount + market.totalNoAmount, USDC_DECIMALS)} volume
                    </div>
                    <div className="text-xs text-white/70">
                      Ends: {new Date(Number(market.endTime) * 1000).toLocaleString()}
                    </div>
                    <div className="text-xs text-white/50">
                      Status: {market.resolved ? 'Resolved' : 'Active'}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Betting Interface */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-6">Place Your Bet</h3>

          {selectedMarketObj ? (
            <div className="space-y-6">
              <div>
                <h4 className="text-white font-medium mb-2">
                  {selectedMarketObj.question}
                </h4>
                <p className="text-white/70 text-sm">{selectedMarketObj.description}</p>
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Choose Outcome</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOutcome(0)}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                      outcome === 0
                        ? 'bg-green-500 text-white'
                        : 'bg-white/20 text-white/70 hover:bg-white/30'
                    }`}
                  >
                    YES
                  </button>
                  <button
                    onClick={() => setOutcome(1)}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                      outcome === 1
                        ? 'bg-red-500 text-white'
                        : 'bg-white/20 text-white/70 hover:bg-white/30'
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Bet Amount (USDC)</label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full py-3 px-4 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-white/50"
                />
              </div>

              <button
                onClick={placeBet}
                disabled={!betAmount || Number(betAmount) <= 0 || loading || selectedMarketObj.resolved}
                className="w-full py-4 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Processing...' : selectedMarketObj.resolved ? 'Market Resolved' : 'Place Bet'}
              </button>

              <div className="p-4 bg-white/5 rounded-lg">
                <div className="text-sm text-white/70">
                  Current Volume: ${formatUnits(selectedMarketObj.totalYesAmount + selectedMarketObj.totalNoAmount, USDC_DECIMALS)}
                </div>
                <div className="text-sm text-white/70">
                  YES: ${formatUnits(selectedMarketObj.totalYesAmount, USDC_DECIMALS)} | 
                  NO: ${formatUnits(selectedMarketObj.totalNoAmount, USDC_DECIMALS)}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-white/70">
              Select a market to place your bet
            </div>
          )}
        </div>
      </div>
    </main>
  )
}