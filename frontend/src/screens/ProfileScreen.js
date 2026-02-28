import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Mail, FileText, Camera, Save } from 'lucide-react-native';
import api from '../api/axiosConfig';
import SweetAlert from '../components/SweetAlert';

export default function ProfileScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [profile, setProfile] = useState({
        username: '',
        fullName: '',
        email: '',
        bio: '',
        profileImage: ''
    });

    // SweetAlert State
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        type: 'success',
        title: '',
        message: '',
        onConfirm: () => { }
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await api.get('/users/profile');
            setProfile(response.data);
        } catch (error) {
            console.error("Error fetching profile:", error);
            showAlert('error', 'Error', 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const showAlert = (type, title, message, onConfirm) => {
        setAlertConfig({
            visible: true,
            type,
            title,
            message,
            onConfirm: () => {
                setAlertConfig(prev => ({ ...prev, visible: false }));
                if (onConfirm) onConfirm();
            }
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/users/profile', profile);
            setIsEditing(false);
            showAlert('success', 'Success', 'Profile updated successfully');
        } catch (error) {
            console.error("Error updating profile:", error);
            showAlert('error', 'Error', 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ArrowLeft color="#ffffff" size={24} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{isEditing ? 'Edit Profile' : 'My Profile'}</Text>
                    <TouchableOpacity
                        onPress={() => {
                            if (isEditing) fetchProfile(); // Reset on cancel
                            setIsEditing(!isEditing);
                        }}
                        style={styles.editToggleBtn}
                    >
                        <Text style={[styles.editToggleText, isEditing && { color: '#ef4444' }]}>
                            {isEditing ? 'Cancel' : 'Edit'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.profileHeader}>
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatarPlaceholder}>
                                <User color="#6366f1" size={40} />
                            </View>
                            <TouchableOpacity style={styles.editAvatarBtn}>
                                <Camera color="#ffffff" size={16} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.username}>@{profile.username}</Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Full Name</Text>
                        <View style={styles.inputContainer}>
                            <User color="#a1a1aa" size={20} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={profile.fullName}
                                onChangeText={(text) => setProfile({ ...profile, fullName: text })}
                                placeholder="Enter your full name"
                                placeholderTextColor="#71717a"
                                editable={isEditing}
                            />
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Email Address</Text>
                        <View style={styles.inputContainer}>
                            <Mail color="#a1a1aa" size={20} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={profile.email}
                                onChangeText={(text) => setProfile({ ...profile, email: text })}
                                placeholder="Enter your email"
                                placeholderTextColor="#71717a"
                                keyboardType="email-address"
                                editable={isEditing}
                            />
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Bio</Text>
                        <View style={[styles.inputContainer, styles.textAreaContainer]}>
                            <FileText color="#a1a1aa" size={20} style={[styles.inputIcon, { marginTop: 12 }]} />
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={profile.bio}
                                onChangeText={(text) => setProfile({ ...profile, bio: text })}
                                placeholder="Write something about yourself"
                                placeholderTextColor="#71717a"
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                editable={isEditing}
                            />
                        </View>
                    </View>

                    {isEditing && (
                        <TouchableOpacity
                            style={styles.saveBtn}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color="#ffffff" />
                            ) : (
                                <>
                                    <Save color="#ffffff" size={20} style={{ marginRight: 8 }} />
                                    <Text style={styles.saveBtnText}>Save Changes</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            <SweetAlert
                visible={alertConfig.visible}
                type={alertConfig.type}
                title={alertConfig.title}
                message={alertConfig.message}
                onConfirm={alertConfig.onConfirm}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0c',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0a0a0c',
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        height: 60,
        borderBottomWidth: 1,
        borderBottomColor: '#18181b',
    },
    headerTitle: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '700',
    },
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
    },
    editToggleBtn: {
        paddingHorizontal: 12,
        height: 44,
        justifyContent: 'center',
    },
    editToggleText: {
        color: '#6366f1',
        fontSize: 16,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 12,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 2,
        borderColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editAvatarBtn: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#0a0a0c',
    },
    username: {
        color: '#ffffff',
        fontSize: 20,
        fontWeight: '700',
    },
    section: {
        marginBottom: 20,
    },
    label: {
        color: '#a1a1aa',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#18181b',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#27272a',
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        height: 54,
        color: '#ffffff',
        fontSize: 15,
    },
    textAreaContainer: {
        alignItems: 'flex-start',
        paddingVertical: 4,
    },
    textArea: {
        height: 100,
        paddingTop: 12,
    },
    saveBtn: {
        backgroundColor: '#6366f1',
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 40,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    saveBtnText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    }
});
