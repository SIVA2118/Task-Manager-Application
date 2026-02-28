import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions
} from 'react-native';
import { CheckCircle2, AlertCircle, XCircle, Info } from 'lucide-react-native';
import { useAudioPlayer } from 'expo-audio';

const { width } = Dimensions.get('window');

const SweetAlert = ({
    visible,
    type = 'success',
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'OK',
    cancelText = 'Cancel',
    showCancel = false
}) => {
    const animation = React.useRef(new Animated.Value(0)).current;

    const getSoundSource = () => {
        if (type === 'error') return 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg';
        if (type === 'warning') return 'https://actions.google.com/sounds/v1/cartoon/wood_plank_flick.ogg';
        return 'https://actions.google.com/sounds/v1/cartoon/pop.ogg';
    };

    const player = useAudioPlayer(getSoundSource());

    React.useEffect(() => {
        if (visible) {
            try {
                if (player) {
                    player.seekTo(0);
                    player.play();
                }
            } catch (err) {
                console.log("Audio play error", err);
            }

            Animated.spring(animation, {
                toValue: 1,
                useNativeDriver: true,
                tension: 50,
                friction: 7
            }).start();
        } else {
            animation.setValue(0);
        }
    }, [visible, type]);

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle2 color="#10b981" size={50} />;
            case 'error': return <XCircle color="#ef4444" size={50} />;
            case 'warning': return <AlertCircle color="#f59e0b" size={50} />;
            case 'info': return <Info color="#3b82f6" size={50} />;
            default: return <CheckCircle2 color="#10b981" size={50} />;
        }
    };

    const getButtonColor = () => {
        switch (type) {
            case 'success': return '#10b981';
            case 'error': return '#ef4444';
            case 'warning': return '#f59e0b';
            case 'info': return '#3b82f6';
            default: return '#6366f1';
        }
    };

    return (
        <Modal transparent visible={visible} animationType="fade">
            <View style={styles.overlay}>
                <Animated.View style={[
                    styles.alertBox,
                    {
                        transform: [{
                            scale: animation.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.8, 1]
                            })
                        }],
                        opacity: animation
                    }
                ]}>
                    <View style={styles.iconContainer}>
                        {getIcon()}
                    </View>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.buttonContainer}>
                        {showCancel && (
                            <TouchableOpacity
                                style={[styles.btn, styles.cancelBtn]}
                                onPress={onCancel}
                            >
                                <Text style={styles.cancelBtnText}>{cancelText}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.btn, { backgroundColor: getButtonColor(), flex: showCancel ? 1 : 0, width: showCancel ? 'auto' : '100%' }]}
                            onPress={onConfirm}
                        >
                            <Text style={styles.confirmBtnText}>{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    alertBox: {
        width: width * 0.85,
        backgroundColor: '#18181b',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#27272a'
    },
    iconContainer: {
        marginBottom: 16
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#ffffff',
        marginBottom: 8,
        textAlign: 'center'
    },
    message: {
        fontSize: 16,
        color: '#a1a1aa',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 12
    },
    btn: {
        paddingVertical: 14,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 100
    },
    cancelBtn: {
        flex: 1,
        backgroundColor: '#27272a',
    },
    confirmBtnText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700'
    },
    cancelBtnText: {
        color: '#a1a1aa',
        fontSize: 16,
        fontWeight: '600'
    }
});

export default SweetAlert;
