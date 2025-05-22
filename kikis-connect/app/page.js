"use client"

import { useState, useEffect } from "react"
import { 
  Box, Avatar, Divider, Checkbox, Button, Typography, List, ListItem, 
  ListItemText, ListItemIcon, Container,
  Snackbar, Alert, Card, CardContent, createTheme, CardActions,
  ThemeProvider, CssBaseline
} from "@mui/material"
import {
  ContactPhone as ContactIcon,
  Contacts as ContactsIcon,
  AddCircle as AddCircleIcon,
  Check as CheckIcon,
  Info as InfoIcon
} from "@mui/icons-material"
import { amber, blueGrey, teal } from '@mui/material/colors'

import HelpIcon from "@mui/icons-material/Help"
import Dialog from '@mui/material/Dialog'

// Import Firebase
import { firestore } from "../firebase"
import { collection, getDocs, query } from "firebase/firestore"

// Create a custom theme
const theme = createTheme({
  palette: {
    primary: {
      main: teal[600],
      light: teal[400],
      dark: teal[800]
    },
    secondary: {
      main: amber[700],
      light: amber[500],
      dark: amber[900]
    },
    background: {
      default: blueGrey[50],
      paper: '#ffffff'
    }
  }
})

function HelpDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose}>
      <Box sx={{ p: 3, maxWidth: 400 }}>
        <Typography variant="h4" gutterBottom>
          How to Use This Page
        </Typography>

        <Typography variant="body1" paragraph>
          Use the checkboxes to select which phone numbers you'd like to save.
        </Typography>

        <Typography variant = "h6">
          <strong>For iOS:</strong>
        </Typography>
          
        <Typography variant="body1" paragraph>
          <ol style={{ paddingLeft: "1.2em" }}>
            <li>Click <strong>Add to Contacts</strong> below</li>
            <li>Tap the download icon in the top right corner</li>
            <li>Select <strong>Contacts</strong> from the options</li>
            <li>Choose <strong>Add All Contacts</strong></li>
            <li>When prompted, select <strong>Create New Contacts</strong></li>
          </ol>
        </Typography>

        <Typography variant = "h6">
          <strong>For Android:</strong>
        </Typography>

        <Typography variant="body1" paragraph>
          <ol style={{ paddingLeft: "1.2em" }}>
            <li>Click <strong>Add to Contacts</strong> below</li>
            <li>When prompted, select <strong>Download</strong></li>
            <li>After the download completes, tap <strong>Open File</strong></li>
            <li>Click <strong>Import</strong>, choose a destination, and confirm by selecting <strong>Import</strong> again</li>
          </ol>
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState([])
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info"
  })
  const [helpOpen, setHelpOpen] = useState(false)

  
  // Get a random color for each contact's avatar
  const getAvatarColor = (name) => {
    return teal[600]
  }
  
  // Get initials from name
  const getInitials = (name) => {
    const exclude = ['of', 'the']
    return name
      .split(' ')
      .filter(word => !exclude.includes(word.toLowerCase()))
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }
  
  
  // Fetch contacts from Firebase when component mounts
  useEffect(() => {
    setHelpOpen(true);
    async function fetchContacts() {
      try {
        const contactsRef = collection(firestore, 'contacts')
        const querySnapshot = await getDocs(query(contactsRef))
        
        // Transform Firebase documents to match app's structure
        const contactsList = []
        let counter = 1
        
        querySnapshot.forEach((doc) => {
          // Get the phone number
          let phoneNumber = doc.data().phone || ""
          
          // Format phone for display if it's a 10-digit number
          let formattedPhone = phoneNumber
          if (phoneNumber.length === 10 && /^\d+$/.test(phoneNumber)) {
            formattedPhone = `(${phoneNumber.substring(0, 3)}) ${phoneNumber.substring(3, 6)}-${phoneNumber.substring(6)}`
          }
          
          contactsList.push({
            id: counter.toString(),
            name: doc.id,
            phone: formattedPhone, // Formatted for display
            rawPhone: phoneNumber, // Raw for adding to contacts
            checked: true // Default checked state
          })
          
          counter++
        })
        
        setContacts(contactsList)
      } catch (error) {
        console.error("Error fetching contacts:", error)
        setSnackbar({
          open: true,
          message: "Failed to load contacts. Please try again.",
          severity: "error"
        })
      }
    }
    
    fetchContacts()
  }, [])
  
  const handleCheckboxChange = (id) => {
    setContacts(contacts.map((contact) => (
      contact.id === id ? { ...contact, checked: !contact.checked } : contact
    )))
  }
  
  // Handle adding to phone contacts
  const addToPhoneContacts = async (selectedContacts) => {
    if (!selectedContacts || selectedContacts.length === 0) {
      setSnackbar({
        open: true,
        message: "No contacts selected.",
        severity: "warning"
      })
      return
    }

     // Try using Contacts API (not yet supported for writing on most browsers)
     if ("contacts" in navigator && "ContactsManager" in window) {
      try {
        const props = ["name", "tel"]
        await navigator.contacts.select(props)  // mostly for reading
        setSnackbar({
          open: true,
          message: "Contacts added successfully!",
          severity: "success"
        })
      } catch (error) {
        console.log("Contacts API error:", error)
        setSnackbar({
          open: true,
          message: "Error adding contacts: " + (error.message || "Please try again"),
          severity: "error"
        })
      }
    }

     // Fallback: Generate a single vCard with all selected contacts
     const vCards = selectedContacts.map((contact) => {
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${contact.name}`,  // Properly formatted with backticks
        `N:;${contact.name};;;`,  // This will put the full name in the First Name field
        `TEL;TYPE=CELL:${contact.rawPhone}`,
        "END:VCARD"
      ].join("\r\n");
    }).join("\r\n");
    
  
    const blob = new Blob([vCards], { type: "text/vcard" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "contacts.vcf"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false })
  }
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <Box
  sx={{
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.palette.background.default,
    position: "relative"
  }}
>
        <Container maxWidth="md">
          {/* Help Button - Added here */}
          <Box sx={{ position: 'absolute', top: 20, right:40, zIndex: 999 }}>
            <Button
              variant="contained"
              onClick={() => setHelpOpen(true)}
              sx={{
                minWidth: 0,
                width: 50,
                height: 50,
                padding: 0,
                borderRadius: "70%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <HelpIcon />
            </Button>
          </Box>

          <Card >
            {/* Header */}
            <Box
              sx={{
                p: 4,
                pb: 2,
                background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                color: "white",
                borderTopLeftRadius: theme.shape.borderRadius,
                borderTopRightRadius: theme.shape.borderRadius,
                position: "relative",
                overflow: "hidden"
              }}
            >
              
              
              <Box sx={{ position: "relative", zIndex: 2 }}>
                <Box display="flex" alignItems="center" gap={2}>
                  <ContactsIcon fontSize="large" />
                  <Typography variant="h5" fontWeight="bold">
                    Important Contacts
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
                  Select contacts to add to your phone
                </Typography>
              </Box>
            </Box>
            

<CardContent sx={{ px: 0, pb: 8 }}>
  <Box
    sx={{
      maxHeight: '400px',
      overflowY: 'auto',
    }}
  >
    {contacts.length === 0 ? (
      <Box
        sx={{
          py: 6,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2
        }}
      >
        <ContactIcon fontSize="large" color="disabled" />
        <Typography color="text.secondary">
          No contacts available
        </Typography>
      </Box>
    ) : (
      <List sx={{ width: '100%' }}>
        {contacts.map((contact) => (
          <Box key={contact.id}
          sx={{
            transition: 'background-color 0.3s ease',
            '&:hover': { backgroundColor: 'rgba(187, 222, 71, 0.05)' }
          }}>
            <ListItem
  button
  onClick={() => handleCheckboxChange(contact.id)}
  sx={{
    py: 2,
    px: 3,
    display: 'flex',
    justifyContent: 'space-between',  // Ensures space between avatar, name, and checkbox
    transition: 'background-color 0.3s ease',
      '&:hover': { backgroundColor: 'rgba(187, 222, 71, 0.05)' }
    
  }}
>
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 1 }}>
    <Avatar
      sx={{
        bgcolor: getAvatarColor(contact.name),
        mr: 2,
        width: 40,
        height: 40,
        fontSize: '1rem',
        fontWeight: 'bold'
      }}
    >
      {getInitials(contact.name)}
    </Avatar>
    
    <ListItemText 
  primary={
    <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>
      {contact.name}
    </span>
  } 
  secondary={
    <span style={{ variant: 'body2', color: 'secondary' }}>
      {contact.phone}
    </span>
  } 
/>
  </Box>

  {/* Move the checkbox to the right side but not too close to the edge */}
  <ListItemIcon sx={{ mr: 2 }}>
    <Checkbox
      edge="end"
      checked={contact.checked}
      sx={{
        '& .MuiSvgIcon-root': {
          fontSize: 24,
          color: contact.checked ? blueGrey[700] : undefined
        }
      }}
    />
  </ListItemIcon>
</ListItem>


            <Divider />
          </Box>
        ))}
      </List>
    )}
  </Box>

            
            {/* Action Footer */}
            <CardActions sx={{ pt: 3, pb: 0.5, px: 2 }}>
  <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
    <Button 
      variant="contained" 
      onClick={() => addToPhoneContacts(contacts.filter(c => c.checked))}
    >
      Add to Contacts
    </Button>
  </Box>
</CardActions>

<Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 1 }}>
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
    <InfoIcon fontSize="small" color="disabled" sx={{ fontSize: 16 }} />
    <Typography variant="caption" color="text.secondary">
      Selected contacts will be added to your device
    </Typography>
  </Box>
</Box>


  </CardContent>
</Card>
        </Container>
      </Box>
      
      {/* Notification Snackbar */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ 
            width: '100%', 
            borderRadius: 2,
            alignItems: 'center'
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  )
}
