import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BACK_BUTTON_MARGIN, FOOTER_PADDING, getFooterOffset } from '@/constants/layout';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

export function GlobalChrome() {
  const navigation = useNavigation();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const backgroundColor = useThemeColor({}, 'background');
  const insets = useSafeAreaInsets();
  const footerOffset = getFooterOffset(insets.bottom);

  const handleBack = () => {
    if ('canGoBack' in navigation && typeof navigation.canGoBack === 'function') {
      if (navigation.canGoBack()) {
        navigation.goBack();
        return;
      }
    }

    router.replace('/');
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        accessibilityHint="Retorna para a tela anterior"
        onPress={handleBack}
        style={[
          styles.backButton,
          {
            top: insets.top + BACK_BUTTON_MARGIN,
            backgroundColor,
            borderColor: Colors[colorScheme].icon,
          },
        ]}>
        <ThemedText style={styles.backLabel}>VOLTAR</ThemedText>
      </Pressable>

      <ThemedView
        accessibilityLabel="Rodapé fixo"
        style={[
          styles.footer,
          {
            backgroundColor,
            paddingBottom: FOOTER_PADDING + insets.bottom,
            borderTopColor: Colors[colorScheme].icon,
            minHeight: footerOffset,
          },
        ]}>
        <ThemedText type="defaultSemiBold">Rodapé fixo</ThemedText>
        <ThemedText style={styles.footerText}>
          Este rodapé permanece visível em todas as telas para navegação e contexto rápidos.
        </ThemedText>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    left: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  backLabel: {
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: FOOTER_PADDING,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  footerText: {
    lineHeight: 18,
  },
});
