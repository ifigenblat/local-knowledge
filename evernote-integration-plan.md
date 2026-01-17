# Evernote Integration Plan for LocalKnowledge

## Overview
This document outlines how to integrate Evernote with LocalKnowledge to import notes and create learning cards.

## Integration Options

### Option 1: Direct Evernote API Integration
- Use Evernote's official API
- Create a new route in the backend
- Add Evernote import functionality to the frontend

### Option 2: MCP Server Integration
- Set up an MCP server that connects to Evernote
- Use the MCP protocol to communicate with Evernote
- Import notes through the MCP server

### Option 3: Evernote Export + Import
- Export notes from Evernote as files
- Use existing file upload functionality
- Process exported files to create cards

## Recommended Approach: Direct API Integration

### Backend Implementation

#### 1. Install Evernote SDK
```bash
cd server
npm install evernote
```

#### 2. Create Evernote Service
Create `server/services/evernoteService.js`:
```javascript
const Evernote = require('evernote');

class EvernoteService {
  constructor(accessToken) {
    this.client = new Evernote.Client({
      token: accessToken,
      sandbox: false, // Set to true for testing
      china: false
    });
    this.noteStore = this.client.getNoteStore();
  }

  async getNotes(notebookGuid = null, maxNotes = 50) {
    try {
      const filter = new Evernote.NoteFilter();
      if (notebookGuid) {
        filter.notebookGuid = notebookGuid;
      }
      
      const spec = new Evernote.NotesMetadataResultSpec({
        includeTitle: true,
        includeContentLength: true,
        includeCreated: true,
        includeUpdated: true,
        includeDeleted: false,
        includeUpdateSequenceNum: false,
        includeNotebookGuid: true,
        includeTagGuids: true,
        includeAttributes: true,
        includeLargestResourceMimeType: false,
        includeLargestResourceSize: false
      });

      const result = await this.noteStore.findNotesMetadata(filter, 0, maxNotes, spec);
      return result.notes;
    } catch (error) {
      console.error('Error fetching notes:', error);
      throw error;
    }
  }

  async getNoteContent(noteGuid) {
    try {
      const note = await this.noteStore.getNote(noteGuid, true, false, false, false);
      return note;
    } catch (error) {
      console.error('Error fetching note content:', error);
      throw error;
    }
  }

  async getNotebooks() {
    try {
      const notebooks = await this.noteStore.listNotebooks();
      return notebooks;
    } catch (error) {
      console.error('Error fetching notebooks:', error);
      throw error;
    }
  }
}

module.exports = EvernoteService;
```

#### 3. Create Evernote Routes
Create `server/routes/evernote.js`:
```javascript
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const EvernoteService = require('../services/evernoteService');
const Card = require('../models/Card');
const contentProcessor = require('../utils/contentProcessor');

// Get user's Evernote notebooks
router.get('/notebooks', auth, async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: 'Evernote access token required' });
    }

    const evernoteService = new EvernoteService(accessToken);
    const notebooks = await evernoteService.getNotebooks();
    
    res.json({ notebooks });
  } catch (error) {
    console.error('Error fetching notebooks:', error);
    res.status(500).json({ error: 'Failed to fetch notebooks' });
  }
});

// Get notes from a specific notebook
router.get('/notes/:notebookGuid', auth, async (req, res) => {
  try {
    const { accessToken } = req.body;
    const { notebookGuid } = req.params;
    const { maxNotes = 50 } = req.query;

    if (!accessToken) {
      return res.status(400).json({ error: 'Evernote access token required' });
    }

    const evernoteService = new EvernoteService(accessToken);
    const notes = await evernoteService.getNotes(notebookGuid, maxNotes);
    
    res.json({ notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Import a specific note as a card
router.post('/import/:noteGuid', auth, async (req, res) => {
  try {
    const { accessToken } = req.body;
    const { noteGuid } = req.params;

    if (!accessToken) {
      return res.status(400).json({ error: 'Evernote access token required' });
    }

    const evernoteService = new EvernoteService(accessToken);
    const note = await evernoteService.getNoteContent(noteGuid);
    
    // Process the note content
    const processedContent = await contentProcessor.processText(note.content);
    
    // Create card from note
    const card = new Card({
      title: note.title,
      content: processedContent.text,
      type: processedContent.type,
      category: processedContent.category,
      tags: processedContent.tags,
      source: `Evernote: ${note.title}`,
      user: req.user.id,
      metadata: {
        evernoteGuid: noteGuid,
        importedAt: new Date(),
        originalContent: note.content
      }
    });

    await card.save();
    res.json({ card, message: 'Note imported successfully' });
  } catch (error) {
    console.error('Error importing note:', error);
    res.status(500).json({ error: 'Failed to import note' });
  }
});

// Import multiple notes
router.post('/import-batch', auth, async (req, res) => {
  try {
    const { accessToken, noteGuids } = req.body;

    if (!accessToken || !noteGuids || !Array.isArray(noteGuids)) {
      return res.status(400).json({ error: 'Access token and note GUIDs required' });
    }

    const evernoteService = new EvernoteService(accessToken);
    const importedCards = [];
    const errors = [];

    for (const noteGuid of noteGuids) {
      try {
        const note = await evernoteService.getNoteContent(noteGuid);
        const processedContent = await contentProcessor.processText(note.content);
        
        const card = new Card({
          title: note.title,
          content: processedContent.text,
          type: processedContent.type,
          category: processedContent.category,
          tags: processedContent.tags,
          source: `Evernote: ${note.title}`,
          user: req.user.id,
          metadata: {
            evernoteGuid: noteGuid,
            importedAt: new Date(),
            originalContent: note.content
          }
        });

        await card.save();
        importedCards.push(card);
      } catch (error) {
        errors.push({ noteGuid, error: error.message });
      }
    }

    res.json({ 
      importedCards, 
      errors,
      message: `Imported ${importedCards.length} notes successfully` 
    });
  } catch (error) {
    console.error('Error importing notes:', error);
    res.status(500).json({ error: 'Failed to import notes' });
  }
});

module.exports = router;
```

#### 4. Update Server Index
Add to `server/index.js`:
```javascript
// Add Evernote routes
app.use('/api/evernote', require('./routes/evernote'));
```

### Frontend Implementation

#### 1. Create Evernote Integration Component
Create `client/src/components/EvernoteIntegration.js`:
```javascript
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-hot-toast';
import { BookOpen, Download, CheckCircle, AlertCircle } from 'lucide-react';

const EvernoteIntegration = () => {
  const [accessToken, setAccessToken] = useState('');
  const [notebooks, setNotebooks] = useState([]);
  const [selectedNotebook, setSelectedNotebook] = useState('');
  const [notes, setNotes] = useState([]);
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Auth, 2: Select Notebook, 3: Select Notes, 4: Import

  const handleConnect = async () => {
    if (!accessToken.trim()) {
      toast.error('Please enter your Evernote access token');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/evernote/notebooks', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({ accessToken })
      });

      if (response.ok) {
        const data = await response.json();
        setNotebooks(data.notebooks);
        setStep(2);
        toast.success('Connected to Evernote successfully!');
      } else {
        throw new Error('Failed to connect to Evernote');
      }
    } catch (error) {
      toast.error('Failed to connect to Evernote. Please check your access token.');
      console.error('Evernote connection error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectNotebook = async (notebookGuid) => {
    setSelectedNotebook(notebookGuid);
    setLoading(true);
    
    try {
      const response = await fetch(`/api/evernote/notes/${notebookGuid}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({ accessToken })
      });

      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes);
        setStep(3);
        toast.success(`Found ${data.notes.length} notes`);
      } else {
        throw new Error('Failed to fetch notes');
      }
    } catch (error) {
      toast.error('Failed to fetch notes from notebook');
      console.error('Notes fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNoteSelection = (noteGuid) => {
    setSelectedNotes(prev => 
      prev.includes(noteGuid) 
        ? prev.filter(id => id !== noteGuid)
        : [...prev, noteGuid]
    );
  };

  const handleImport = async () => {
    if (selectedNotes.length === 0) {
      toast.error('Please select at least one note to import');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/evernote/import-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({ 
          accessToken, 
          noteGuids: selectedNotes 
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        setStep(4);
      } else {
        throw new Error('Failed to import notes');
      }
    } catch (error) {
      toast.error('Failed to import notes');
      console.error('Import error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <BookOpen className="h-8 w-8 text-green-500" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Import from Evernote
          </h2>
        </div>

        {/* Step 1: Authentication */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Evernote Access Token
              </label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Enter your Evernote access token"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Get your access token from Evernote's developer settings
              </p>
            </div>
            <button
              onClick={handleConnect}
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Connecting...' : 'Connect to Evernote'}
            </button>
          </div>
        )}

        {/* Step 2: Select Notebook */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Select a Notebook
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notebooks.map((notebook) => (
                <div
                  key={notebook.guid}
                  onClick={() => handleSelectNotebook(notebook.guid)}
                  className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {notebook.name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {notebook.noteCount} notes
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Select Notes */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Select Notes to Import ({selectedNotes.length} selected)
            </h3>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {notes.map((note) => (
                <div
                  key={note.guid}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedNotes.includes(note.guid)
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => handleNoteSelection(note.guid)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {note.title}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(note.created).toLocaleDateString()}
                      </p>
                    </div>
                    {selectedNotes.includes(note.guid) && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleImport}
              disabled={loading || selectedNotes.length === 0}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Importing...' : `Import ${selectedNotes.length} Notes`}
            </button>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Import Complete!
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Your Evernote notes have been successfully imported as cards.
            </p>
            <button
              onClick={() => {
                setStep(1);
                setAccessToken('');
                setNotebooks([]);
                setNotes([]);
                setSelectedNotes([]);
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Import More Notes
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EvernoteIntegration;
```

#### 2. Add Evernote Page
Create `client/src/pages/Evernote.js`:
```javascript
import React from 'react';
import EvernoteIntegration from '../components/EvernoteIntegration';

const Evernote = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <EvernoteIntegration />
    </div>
  );
};

export default Evernote;
```

#### 3. Update Navigation
Add Evernote import to your navigation menu.

### Getting Evernote Access Token

1. Go to [Evernote Developer](https://dev.evernote.com/)
2. Create a developer account
3. Create a new app
4. Get your access token from the app settings

### Alternative: MCP Server Approach

If you prefer using MCP, you would:

1. Create an MCP server that connects to Evernote
2. Use the MCP protocol to communicate with your app
3. Set up the MCP server as a separate service

Would you like me to implement any of these approaches, or do you have questions about the integration process?
