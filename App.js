import StatusBar from 'expo-status-bar';
import { StyleSheet, Text, View, Button, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';

// Configure how notifications are handled when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});


export default function App() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState('not_started');


  useEffect(() => {
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    // Listen for notifications received while app is running
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
      Alert.alert(
        'Notification Received!',
        notification.request.content.body,
        [{ text: 'OK' }]
      );
    });

    // Listen for notification taps
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);


  async function registerForPushNotificationsAsync() {
    let token;
    
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      Alert.alert('Permission denied', 'Failed to get push token for push notification!');
      return;
    }
    
    // Get the token
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Expo Push Token:', token);
    
    return token;
  }

  async function sendTokenToBackend() {
    if (!expoPushToken) {
      Alert.alert('Error', 'No push token available');
      return;
    }

    setRegistrationStatus('registering');
    
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/register-push-token-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contact_id: 'contact-fake-123',
          token: expoPushToken,
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setRegistrationStatus('success');
        Alert.alert('Success!', 'Push token registered successfully');
        console.log('Registration result:', result);
      } else {
        throw new Error(result.error || 'Registration failed');
      }
    } catch (error) {
      setRegistrationStatus('error');
      Alert.alert('Error', `Failed to register token: ${error.message}`);
      console.error('Registration error:', error);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Push Notification Test App</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Permission Status</Text>
        <Text style={styles.tokenText}>
          {expoPushToken ? '✅ Permissions granted' : '⏳ Requesting permissions...'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Expo Push Token</Text>
        <Text style={styles.tokenText}>
          {expoPushToken ? `${expoPushToken.substring(0, 20)}...` : 'Loading...'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Register with Backend</Text>
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
        <Text style={styles.sectionTitle}>4. Test Notifications</Text>
        <Text style={styles.instructions}>
          Send a test notification from your backend to contact-fake-123
        </Text>
        {notification && (
          <Text style={styles.notificationText}>
            Last notification: {notification.request.content.title}
          </Text>
        )}
      </View>

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  tokenText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
  },
  instructions: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  notificationText: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 10,
    fontWeight: 'bold',
  },
});

