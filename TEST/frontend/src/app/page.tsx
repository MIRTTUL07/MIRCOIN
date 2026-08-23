'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { Search, Globe, Shield, Zap, Plus, ExternalLink } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface DNSRecord {
  domain: string;
  ipAddress: string;
  owner: string;
  timestamp: string;
  expirationTime: string;
  isActive: boolean;
  recordType: string;
  additionalData: string;
  resolved: boolean;
  cached?: boolean;
}

export default function Home() {
  const [searchDomain, setSearchDomain] = useState('');
  const [resolvedRecord, setResolvedRecord] = useState<DNSRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState<string>('');
  const [stats, setStats] = useState({ totalDomains: 0, blockNumber: 0 });

  // Connect to MetaMask
  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });
        setAccount(accounts[0]);
        setConnected(true);
        toast.success('Wallet connected successfully!');
      } else {
        toast.error('MetaMask not found. Please install MetaMask.');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet');
    }
  };

  // Fetch blockchain stats
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Resolve domain
  const resolveDomain = async () => {
    if (!searchDomain.trim()) {
      toast.error('Please enter a domain name');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/resolve/${searchDomain}`);
      setResolvedRecord(response.data);
      toast.success('Domain resolved successfully!');
    } catch (error: any) {
      console.error('Error resolving domain:', error);
      if (error.response?.status === 404) {
        toast.error('Domain not found');
        setResolvedRecord(null);
      } else if (error.response?.status === 410) {
        toast.error('Domain has expired');
        setResolvedRecord(null);
      } else {
        toast.error('Failed to resolve domain');
      }
    } finally {
      setLoading(false);
    }
  };

  // Check domain availability
  const checkAvailability = async (domain: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/available/${domain}`);
      return response.data.available;
    } catch (error) {
      console.error('Error checking availability:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">dDNS</h1>
                <p className="text-sm text-gray-600">Decentralized DNS Resolver</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{stats.totalDomains}</span> domains registered
              </div>
              
              {!connected ? (
                <button
                  onClick={connectWallet}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium"
                >
                  Connect Wallet
                </button>
              ) : (
                <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm font-medium">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Decentralized DNS for the
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Future</span>
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Secure, user-owned domain records powered by blockchain technology. 
            Take control of your digital identity with dDNS.
          </p>

          {/* Search Box */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Enter domain name (e.g., example.ddns)"
                  value={searchDomain}
                  onChange={(e) => setSearchDomain(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && resolveDomain()}
                  className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                />
              </div>
              <button
                onClick={resolveDomain}
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Resolving...' : 'Resolve'}
              </button>
            </div>
          </div>

          {/* Resolved Record Display */}
          {resolvedRecord && (
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-12 text-left animate-slide-up">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Domain Record</h3>
                {resolvedRecord.cached && (
                  <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                    Cached
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Domain</label>
                  <div className="bg-gray-50 p-3 rounded-lg font-mono text-lg">
                    {resolvedRecord.domain}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">IP Address</label>
                  <div className="bg-gray-50 p-3 rounded-lg font-mono text-lg">
                    {resolvedRecord.ipAddress}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Record Type</label>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    {resolvedRecord.recordType}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <div className={`p-3 rounded-lg font-medium ${
                    resolvedRecord.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {resolvedRecord.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Owner</label>
                  <div className="bg-gray-50 p-3 rounded-lg font-mono text-sm break-all">
                    {resolvedRecord.owner}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Registered</label>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    {new Date(resolvedRecord.timestamp).toLocaleDateString()}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expires</label>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    {new Date(resolvedRecord.expirationTime).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Why Choose dDNS?</h3>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience the next generation of domain name resolution with blockchain-powered security and decentralization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-4">Secure & Immutable</h4>
              <p className="text-gray-600">
                Your domain records are secured by blockchain technology, making them tamper-proof and permanently accessible.
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100">
              <div className="bg-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-4">Truly Decentralized</h4>
              <p className="text-gray-600">
                No central authority controls your domains. You own your digital identity completely and permanently.
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-green-50 to-green-100">
              <div className="bg-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-4">Fast Resolution</h4>
              <p className="text-gray-600">
                Lightning-fast domain resolution with intelligent caching and optimized blockchain queries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-white mb-6">Ready to Get Started?</h3>
          <p className="text-xl text-blue-100 mb-8">
            Register your first decentralized domain and join the future of the internet.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 px-8 py-4 rounded-xl font-medium hover:bg-gray-100 transition-colors duration-200 flex items-center justify-center">
              <Plus className="h-5 w-5 mr-2" />
              Register Domain
            </button>
            <button className="border-2 border-white text-white px-8 py-4 rounded-xl font-medium hover:bg-white hover:text-blue-600 transition-colors duration-200 flex items-center justify-center">
              <ExternalLink className="h-5 w-5 mr-2" />
              View Documentation
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold">dDNS</span>
            </div>
            
            <div className="text-gray-400 text-sm">
              <p>Powered by blockchain technology • Block #{stats.blockNumber}</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
