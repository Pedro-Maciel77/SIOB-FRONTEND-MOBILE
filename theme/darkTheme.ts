import { MD3DarkTheme } from 'react-native-paper';

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#e53935',
    background: '#121212',
    surface: '#1e1e1e',
  },
};
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    padding: 16,
    marginVertical: 8,
  },
  input: {
    marginBottom: 12,
  },
});

export default styles;
