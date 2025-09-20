'use client'

import { Inter } from 'next/font/google'
import './globals.css'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { arbitrumSepolia } from 'wagmi/chains'
import '@rainbow-me/rainbowkit/styles.css'

const inter = Inter({ subsets: ['latin'] })

const config = getDefaultConfig({
  appName: 'ArbiTruth',
  projectId: 'arbitruth-demo-123', // Temporary for demo
  chains: [arbitrumSepolia],
  ssr: false,
})

// Add Arbitrum Sepolia to MetaMask if not already added
if (typeof window !== 'undefined' && window.ethereum) {
  window.ethereum.request({
    method: 'wallet_addEthereumChain',
    params: [{
      chainId: '0x66eee',
      chainName: 'Arbitrum Sepolia',
      rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
      nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
      blockExplorerUrls: ['https://sepolia.arbiscan.io/']
    }]
  }).catch(() => {})
}

const queryClient = new QueryClient()

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider>
              <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
                <nav className="p-4 border-b border-white/10">
                  <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-white">🎯 ArbiTruth</h1>
                    <div className="flex gap-4">
                      <w3m-button />
                    </div>
                  </div>
                </nav>
                {children}
              </div>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  )
}