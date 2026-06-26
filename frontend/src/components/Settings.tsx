import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { LLMConfig, LLMConfigResponse, LLMProvider } from '../types/game';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const providerLabels: Record<LLMProvider, string> = {
  sentence_transformer: 'Sentence Transformer (Local)',
  openrouter: 'OpenRouter',
  openai: 'OpenAI Direct',
  ollama: 'Ollama (Local)',
};

const defaultModels: Record<string, string> = {
  sentence_transformer: 'all-MiniLM-L6-v2',
  openrouter: 'openai/gpt-3.5-turbo',
  openai: 'gpt-3.5-turbo',
  ollama: 'llama3.2:3b',
};

export default function Settings({ isOpen, onClose }: SettingsProps) {
  const [config, setConfig] = useState<LLMConfigResponse | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider | null>(null);
  const [model, setModel] = useState('');
  const [similarityThreshold, setSimilarityThreshold] = useState(0.75);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiService.getLLMConfig();
      setConfig(data);
      setSelectedProvider(data.provider as LLMProvider);
      setModel(data.model || defaultModels[data.provider] || '');
      setSimilarityThreshold(data.similarity_threshold || 0.75);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load config');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderChange = (provider: LLMProvider) => {
    setSelectedProvider(provider);
    setModel(defaultModels[provider] || '');
  };

  const handleSave = async () => {
    if (!selectedProvider) return;
    
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const updateConfig: LLMConfig = {
        provider: selectedProvider,
        model: model || defaultModels[selectedProvider],
      };
      
      if (selectedProvider === 'sentence_transformer') {
        updateConfig.similarity_threshold = similarityThreshold;
      }
      
      const data = await apiService.updateLLMConfig(updateConfig);
      setConfig(data);
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        
        {isLoading ? (
          <div className="settings-loading">Loading...</div>
        ) : error && !config ? (
          <div className="settings-error">{error}</div>
        ) : config ? (
          <>
            <div className="settings-section">
              <h3>LLM Provider</h3>
              <p className="settings-description">Select which LLM provider to use for answer validation.</p>
              
              <div className="provider-list">
                {(config.available_providers as LLMProvider[]).map((provider) => (
                  <label
                    key={provider}
                    className={`provider-option ${selectedProvider === provider ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="provider"
                      value={provider}
                      checked={selectedProvider === provider}
                      onChange={() => handleProviderChange(provider)}
                    />
                    <span className="provider-label">{providerLabels[provider]}</span>
                    {selectedProvider === provider && (
                      <span className="current-badge">Current</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            <div className="settings-section">
              <h3>Model</h3>
              <p className="settings-description">
                {selectedProvider === 'sentence_transformer' 
                  ? 'Select the sentence transformer model for embeddings.'
                  : selectedProvider === 'ollama'
                  ? 'The model is determined by your Ollama server.'
                  : 'Enter the model identifier for the selected provider.'}
              </p>
              
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={defaultModels[selectedProvider!] || ''}
                className="settings-input"
                disabled={selectedProvider === 'ollama'}
              />
              
              {selectedProvider === 'sentence_transformer' && (
                <div className="threshold-setting">
                  <label>
                    <span>Similarity Threshold: {similarityThreshold.toFixed(2)}</span>
                    <input
                      type="range"
                      min="0.5"
                      max="1.0"
                      step="0.05"
                      value={similarityThreshold}
                      onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                      className="settings-slider"
                    />
                  </label>
                </div>
              )}
            </div>

            {error && <div className="settings-error">{error}</div>}
            {success && <div className="settings-success">{success}</div>}

            <div className="settings-actions">
              <button 
                className="save-button" 
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
