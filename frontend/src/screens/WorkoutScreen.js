import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Clock, Trash2, Activity, Play, Square, RefreshCcw } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useEffect } from 'react';
import api from '../api/axiosConfig';
import SweetAlert from '../components/SweetAlert';

export default function WorkoutScreen({ navigation }) {
    const [workouts, setWorkouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [name, setName] = useState('');
    const [duration, setDuration] = useState('');
    const [activeTimers, setActiveTimers] = useState({}); // { id: remainingSeconds }

    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        type: 'success',
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const fetchWorkouts = async () => {
        try {
            const response = await api.get('/workouts');
            setWorkouts(response.data || []);
        } catch (error) {
            console.error("Error fetching workouts:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchWorkouts();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchWorkouts();
    };

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveTimers(prev => {
                const next = { ...prev };
                let updated = false;
                Object.keys(next).forEach(id => {
                    if (next[id] > 0) {
                        next[id] -= 1;
                        updated = true;
                        if (next[id] === 0) {
                            const workout = workouts.find(w => w.id === id);
                            setAlertConfig({
                                visible: true,
                                type: 'success',
                                title: 'Workout Finished! 🎉',
                                message: `Time is up for "${workout?.name || 'your workout'}"!`,
                                onConfirm: () => setAlertConfig(p => ({ ...p, visible: false }))
                            });
                        }
                    }
                });
                return updated ? next : prev;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [workouts]);

    const startTimer = (id, durationMins) => {
        setActiveTimers(prev => ({
            ...prev,
            [id]: prev[id] !== undefined && prev[id] > 0 ? prev[id] : durationMins * 60
        }));
    };

    const stopTimer = (id) => {
        setActiveTimers(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleAddWorkout = async () => {
        if (!name || !duration) {
            setAlertConfig({
                visible: true,
                type: 'warning',
                title: 'Missing Info',
                message: 'Please enter workout name and duration.',
                onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false }))
            });
            return;
        }

        try {
            const payload = {
                name,
                duration: parseInt(duration),
                date: new Date().toISOString()
            };
            const response = await api.post('/workouts', payload);
            setWorkouts([response.data, ...workouts]);
            setName('');
            setDuration('');
        } catch (error) {
            console.error("Error adding workout:", error);
        }
    };

    const handleDeleteWorkout = async (id) => {
        try {
            await api.delete(`/workouts/${id}`);
            setWorkouts(workouts.filter(w => w.id !== id));
        } catch (error) {
            console.error("Error deleting workout:", error);
        }
    };

    const renderWorkout = ({ item }) => {
        const isRunning = activeTimers[item.id] !== undefined && activeTimers[item.id] > 0;
        return (
            <View style={styles.workoutCard}>
                <View style={styles.workoutInfo}>
                    <Activity color={isRunning ? "#10b981" : "#6366f1"} size={20} />
                    <View style={{ marginLeft: 12 }}>
                        <Text style={styles.workoutName}>{item.name}</Text>
                        <View style={styles.durationRow}>
                            <Clock color="#a1a1aa" size={14} />
                            <Text style={styles.workoutDuration}>
                                {isRunning ? formatTime(activeTimers[item.id]) : `${item.duration} mins`}
                            </Text>
                        </View>
                    </View>
                </View>
                <View style={styles.actionRow}>
                    {!isRunning ? (
                        <TouchableOpacity style={styles.playBtn} onPress={() => startTimer(item.id, item.duration)}>
                            <Play color="#10b981" size={20} fill="#10b981" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.stopBtn} onPress={() => stopTimer(item.id)}>
                            <Square color="#ef4444" size={20} fill="#ef4444" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => handleDeleteWorkout(item.id)}>
                        <Trash2 color="#ef4444" size={20} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <ArrowLeft color="#ffffff" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Workout Tracker</Text>
                <View style={{ width: 44 }} />
            </View>

            <View style={styles.addSection}>
                <TextInput
                    style={styles.input}
                    placeholder="Workout Name (e.g. Running)"
                    placeholderTextColor="#71717a"
                    value={name}
                    onChangeText={setName}
                />
                <View style={styles.row}>
                    <TextInput
                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                        placeholder="Duration (mins)"
                        placeholderTextColor="#71717a"
                        keyboardType="numeric"
                        value={duration}
                        onChangeText={setDuration}
                    />
                    <TouchableOpacity style={styles.addBtn} onPress={handleAddWorkout}>
                        <Plus color="#ffffff" size={24} />
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            ) : (
                <FlatList
                    data={workouts}
                    keyExtractor={item => item.id}
                    renderItem={renderWorkout}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#6366f1"
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No workouts recorded yet.</Text>
                        </View>
                    }
                />
            )}

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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#18181b',
    },
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ffffff',
    },
    addSection: {
        padding: 20,
        backgroundColor: '#18181b',
        borderBottomWidth: 1,
        borderBottomColor: '#27272a',
    },
    input: {
        backgroundColor: '#09090b',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 50,
        color: '#ffffff',
        fontSize: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#27272a',
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    addBtn: {
        width: 50,
        height: 50,
        backgroundColor: '#6366f1',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        padding: 20,
    },
    workoutCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#18181b',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#27272a',
    },
    workoutInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    workoutName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    durationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    },
    workoutDuration: {
        fontSize: 14,
        color: '#a1a1aa',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    emptyText: {
        color: '#a1a1aa',
        fontSize: 16,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    playBtn: {
        padding: 4,
    },
    stopBtn: {
        padding: 4,
    }
});
