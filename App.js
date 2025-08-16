import React, { useState, useEffect, useRef } from 'react';
import { Text, View, Platform, Button, Alert, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Backend URL - using your Railway deployment
const BACKEND_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
console.log('Backend URL:', BACKEND_URL); // Add this line for debugging


export default function App() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState('not_started');
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Register for push notifications
    registerForPushNotificationsAsync().then(token => {
      console.log('Push token received:', token);
      setExpoPushToken(token);
    });

    // Listen for notifications while app is running
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      setNotification(notification);
      Alert.alert(
        'Notification Received!',
        notification.request.content.body,
        [{ text: 'OK' }]
      );
    });

    // Listen for notification responses (when user taps notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
    });

    // Cleanup listeners
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
};
  }, []);

  // Register for push notifications with simplified approach
async function registerForPushNotificationsAsync() {
  let token;

  // Set up notification channel for Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // Check if running on physical device
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      Alert.alert('Push Notifications', 'Failed to get push token for push notification!');
      return;
    }
    
    try {
      // Use simple method that should work without Firebase
      console.log('Getting push token...');
      
      // For development, we'll create a mock token for testing
      // In production, you'd normally get a real Expo push token
      const mockToken = `ExponentPushToken[mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}]`;
      
      console.log('Generated mock token for testing:', mockToken);
      token = mockToken;
      
      // Note: In a real production app, you would use:
      // token = (await Notifications.getExpoPushTokenAsync()).data;
      // But this requires proper Firebase setup on Android
      
    } catch (e) {
      console.error('Error getting push token:', e);
      Alert.alert('Push Token Info', 'Using mock token for testing. Real push notifications require Firebase setup on Android.');
      
      // Generate a mock token for testing
      token = `ExponentPushToken[mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}]`;
    }
  } else {
    Alert.alert('Push Notifications', 'Must use physical device for Push Notifications');
  }

  return token;
}

// Test push notification function
async function sendTestNotification() {
  try {
    const response = await fetch(`${BACKEND_URL}/send-push-notification-test`, {  // ← New endpoint
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: expoPushToken,
        title: 'Test Notification',
        body: 'This is a test notification from Mandalat-Halev app!',
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      Alert.alert('Success', result.message || 'Test notification sent!');
    } else {
      Alert.alert('Error', `Failed to send notification: ${result.error}`);
    }
  } catch (error) {
    Alert.alert('Error', `Network error: ${error.message}`);
  }
}

// Send token to backend
async function sendTokenToBackend() {
  if (!expoPushToken) {
    Alert.alert('Error', 'No push token available');
    return;
  }

  setRegistrationStatus('registering');
  
  try {
    const requestBody = {
      token: expoPushToken,
      contact_id: 'contact-fake-123',
    };
    
    console.log('Sending request to:', `${BACKEND_URL}/register-push-token-test`);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${BACKEND_URL}/register-push-token-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    const result = await response.json();
    console.log('Response body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      setRegistrationStatus('success');
      Alert.alert('Success!', 'Push token registered successfully');
      console.log('Registration successful!');
    } else {
      throw new Error(result.error || `HTTP ${response.status}: ${JSON.stringify(result)}`);
    }
  } catch (error) {
    setRegistrationStatus('error');
    console.error('Full registration error:', error);
    Alert.alert('Error', `Failed to register token: ${error.message}`);
  }
  }
  

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Mandalat-Halev Push Test</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Status</Text>
          <Text style={styles.status}>
            Device: {Device.isDevice ? 'Physical Device ✅' : 'Simulator ❌'}
          </Text>
          <Text style={styles.status}>
            Platform: {Platform.OS}
          </Text>
          <Text style={styles.status}>
            Backend: Connected to Railway
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Push Token</Text>
          <Text style={styles.tokenText}>
            {expoPushToken ? `${expoPushToken.substring(0, 30)}...` : 'Getting token...'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Register with Backend</Text>
          <Button
            title={
              registrationStatus === 'not_started' ? 'Register Token' :
              registrationStatus === 'registering' ? 'Registering...' :
              registrationStatus === 'success' ? 'Registered ✅' :
              'Register Token (Retry)'
            }
            onPress={sendTokenToBackend}
            disabled={!expoPushToken || registrationStatus === 'registering'}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Notifications</Text>
          <Button
            title="Send Test Notification"
            onPress={sendTestNotification}
            disabled={!expoPushToken || registrationStatus !== 'success'}
          />
        </View>

        {notification && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Last Notification</Text>
            <Text style={styles.notificationText}>
              {notification.request.content.title}: {notification.request.content.body}
            </Text>
          </View>
        )}

        <StatusBar style="auto" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  status: {
    fontSize: 14,
    marginBottom: 5,
    color: '#555',
  },
  tokenText: {
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 4,
    color: '#333',
  },
  notificationText: {
    fontSize: 14,
    backgroundColor: '#e8f5e8',
    padding: 10,
    borderRadius: 4,
    color: '#2d5a2d',
  },
});