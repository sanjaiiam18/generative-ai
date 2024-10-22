// Utility function for creating delays
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Store all conversations
let conversations = [];
let currentConversationId = null;

// Function to sanitize and format HTML content
function formatContent(content) {
  content = content.replace(/<p>(.*?)<\/p>/g, '$1');
  content = content.replace(/&#39;/g, "'");
  content = content.replace(/<\/?[^>]+(>|$)/g, '');
  return content;
}

// Function to split explanation and code, and add copy buttons
function processAndFormatMessage(text) {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  const parts = [];
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before the code block
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index)
      });
    }

    // Add the code block
    parts.push({
      type: 'code',
      language: match[1] || '',
      content: match[2].trim()
    });

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text after the last code block
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex)
    });
  }

  return parts;
}

// Function to create a copy button with symbol
function createCopyButton() {
  const button = document.createElement('button');
  button.innerHTML = '&#128464;'; // Unicode for clipboard symbol
  button.className = 'copy-button';
  button.title = 'Copy to clipboard';
  button.addEventListener('click', function() {
    const codeElement = this.parentNode.querySelector('code');
    navigator.clipboard.writeText(codeElement.textContent).then(() => {
      const originalSymbol = this.innerHTML;
      this.innerHTML = '&#10004;'; // Unicode for checkmark
      setTimeout(() => {
        this.innerHTML = originalSymbol;
      }, 2000);
    });
  });
  return button;
}

const textarea = document.getElementById('prompt');
const responseDiv = document.getElementById('response');

// Function to adjust the height of the textarea and response div dynamically
textarea.addEventListener('input', function () {
    this.style.height = 'auto'; // Reset height to auto to shrink if necessary
    this.style.height = this.scrollHeight + 'px'; // Set height based on content
    
    // Adjust response div height
    const remainingHeight = window.innerHeight - this.offsetHeight - 100; // 100px buffer
    responseDiv.style.height = `${remainingHeight}px`;
});

// Prevent form submission if Shift + Enter is pressed (allows new line)
textarea.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.shiftKey) {
        // Allow new line
        e.preventDefault();
        this.value += '\n'; // Add new line to the text area
    }
});

// Stream text chunks to a given element
async function streamText(textChunks, element) {
  try {
    for (const chunk of textChunks) {
      const formattedChunk = formatContent(chunk);
      element.textContent += formattedChunk;
      await delay(20);
    }
  } catch (error) {
    console.error('Error streaming text:', error);
  }
}

// Helper function to chunk text into smaller parts
function chunkText(text, size) {
  if (!text) return [];
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

// Function to create a new conversation
function createNewConversation() {
    const id = Date.now().toString();
    const conversation = {
        id: id,
        title: "New Conversation",
        messages: []
    };
    
    conversations.push(conversation);
    currentConversationId = id;
    updateConversationList();
    clearResponseArea();
    localStorage.setItem('conversations', JSON.stringify(conversations));

    // Focus on the prompt input and trigger search
    const promptElement = document.getElementById('prompt');
    promptElement.focus();
    promptElement.value = ""; // Clear any existing text
    promptNewConversation();
}

// Function to prompt for new conversation
function promptNewConversation() {
    const promptText = "What would you like to chat about?";
    appendMessage(promptText, 'ai');
    
    const conversation = conversations.find(conv => conv.id === currentConversationId);
    if (conversation) {
        conversation.messages.push({
            role: 'assistant',
            content: promptText
        });
        localStorage.setItem('conversations', JSON.stringify(conversations));
    }
}

// Function to update the conversation list in the sidebar
function updateConversationList() {
    const listElement = document.getElementById('conversationList');
    listElement.innerHTML = '';
    conversations.forEach(conv => {
        const item = document.createElement('div');
        item.className = 'conversation-item';
        
        const textSpan = document.createElement('span');
        textSpan.textContent = conv.title;
        textSpan.onclick = () => loadConversation(conv.id);
        item.appendChild(textSpan);
        
        const renameButton = document.createElement('button');
        renameButton.className = 'rename-button';
        renameButton.innerHTML = '&#9998;'; // Unicode for pencil
        renameButton.onclick = (e) => {
            e.stopPropagation();
            renameConversation(conv.id);
        };
        item.appendChild(renameButton);
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.innerHTML = '&times;';
        deleteButton.onclick = (e) => {
            e.stopPropagation();
            deleteConversation(conv.id);
        };
        item.appendChild(deleteButton);
        
        listElement.appendChild(item);
    });
}

// Function to rename a conversation
function renameConversation(id) {
    const conversation = conversations.find(conv => conv.id === id);
    if (conversation) {
        let newTitle = prompt("Enter new conversation title:", conversation.title);
        if (newTitle !== null && newTitle.trim() !== "") {
            newTitle = newTitle.trim();
            
            // Check if the name already exists
            let isUnique = false;
            let counter = 0;
            let uniqueTitle = newTitle;
            
            while (!isUnique) {
                if (conversations.some(conv => conv.id !== id && conv.title === uniqueTitle)) {
                    // If the title exists, add a random number
                    counter++;
                    const randomNum = Math.floor(Math.random() * 1000);
                    uniqueTitle = `${newTitle} (${randomNum})`;
                } else {
                    isUnique = true;
                }
                
                // Avoid infinite loop
                if (counter > 1000) {
                    alert("Unable to generate a unique name. Please try a different name.");
                    return;
                }
            }
            
            conversation.title = uniqueTitle;
            localStorage.setItem('conversations', JSON.stringify(conversations));
            updateConversationList();
        }
    }
}

// Function to load a specific conversation
function loadConversation(id) {
    currentConversationId = id;
    clearResponseArea();
    const conversation = conversations.find(conv => conv.id === id);
    if (conversation) {
        conversation.messages.forEach(message => {
            appendMessage(message.content, message.role === 'user' ? 'user' : 'ai');
        });
    }
}

// Function to clear the response area
function clearResponseArea() {
    const responseDiv = document.getElementById("response");
    if (responseDiv) {
        responseDiv.innerHTML = '';
    }
}

// Helper function to append messages to the conversation
function appendMessage(text, sender) {
  try {
    const responseDiv = document.getElementById("response");
    if (!responseDiv) throw new Error("Response container not found");

    const messageDiv = document.createElement("div");
    messageDiv.classList.add(sender);

    const parts = processAndFormatMessage(text);

    parts.forEach(part => {
      if (part.type === 'text') {
        const textElement = document.createElement('p');
        textElement.textContent = formatContent(part.content);
        messageDiv.appendChild(textElement);
      } else if (part.type === 'code') {
        const codeBlock = document.createElement('div');
        codeBlock.className = 'code-block';

        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = part.content;
        if (part.language) {
          code.className = `language-${part.language}`;
        }

        pre.appendChild(code);
        codeBlock.appendChild(pre);
        codeBlock.appendChild(createCopyButton());
        messageDiv.appendChild(codeBlock);
      }
    });

    responseDiv.appendChild(messageDiv);
    responseDiv.scrollTop = responseDiv.scrollHeight;

    return messageDiv;
  } catch (error) {
    console.error('Error appending message:', error);
    return null;
  }
}

// Main function to handle API call and stream response
async function generateText() {
  const promptElement = document.getElementById('prompt');
  if (!promptElement) {
    console.error('Prompt element not found');
    return;
  }

  const prompt = promptElement.value.trim();

  // Validate user input
  if (!prompt) {
    alert('Please enter a prompt.');
    return;
  }

  // Clear the input box
  promptElement.value = '';

  // Append user's message to the conversation
  appendMessage(prompt, 'user');

  try {
    const conversation = conversations.find(conv => conv.id === currentConversationId);
    if (!conversation) {
      throw new Error('Current conversation not found');
    }

    // Add user message to the conversation
    conversation.messages.push({
      role: 'user',
      content: prompt
    });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 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',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: conversation.messages,
        temperature: 0.7,
        max_tokens: 2048,
        
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from API');
    }

    const fullResponse = data.choices[0].message.content;
    appendMessage(fullResponse, 'ai');
    
    // After appending is complete, update the conversation with the full AI response
    conversation.messages.push({
      role: 'assistant',
      content: fullResponse
    });
    
    // Save the updated conversations to localStorage
    localStorage.setItem('conversations', JSON.stringify(conversations));

  } catch (error) {
    console.error("Error during API call:", error);
    appendMessage("An error occurred while fetching the response. Please try again.", 'ai');
  }
}

// Function to load conversations from localStorage
function loadConversations() {
    const savedConversations = localStorage.getItem('conversations');
    if (savedConversations) {
        conversations = JSON.parse(savedConversations);
        updateConversationList();
        if (conversations.length > 0) {
            loadConversation(conversations[conversations.length - 1].id);
        } else {
            createNewConversation();
        }
    } else {
        createNewConversation();
    }
}

// Handle keypress event for 'Enter' key
function handleKeyPress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    generateText();
  }
}

// Function to delete a conversation
function deleteConversation(id) {
  const index = conversations.findIndex(conv => conv.id === id);
  if (index !== -1) {
      conversations.splice(index, 1);
      localStorage.setItem('conversations', JSON.stringify(conversations));
      updateConversationList();
      
      if (currentConversationId === id) {
          if (conversations.length > 0) {
              loadConversation(conversations[conversations.length - 1].id);
          } else {
              createNewConversation();
          }
      }
  }
}

// Initialize the application
function initializeApp() {
  try {
    const promptElement = document.getElementById('prompt');
    const newConversationButton = document.getElementById('newConversation');

    if (!promptElement || !newConversationButton) {
      throw new Error('Required elements not found');
    }

    promptElement.addEventListener('keypress', handleKeyPress);
    newConversationButton.addEventListener('click', createNewConversation);

    window.agent = generateText;

    // Load previous conversations
    loadConversations();

    // Initial adjustment of response div height
    const remainingHeight = window.innerHeight - promptElement.offsetHeight - 100;
    responseDiv.style.height = `${remainingHeight}px`;

    console.log('Chat interface initialized successfully');
  } catch (error) {
    console.error('Error initializing app:', error);
  }
}

// Call initialization when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeApp);