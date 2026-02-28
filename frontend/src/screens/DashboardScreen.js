import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Plus, LogOut, CheckCircle2, Circle, Clock, AlertTriangle, Trash2, Edit3, User as UserIcon, Activity, MessageSquare, Paperclip, CheckSquare } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/axiosConfig';
import SweetAlert from '../components/SweetAlert';

export default function DashboardScreen({ navigation }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('All'); // All, High, Medium, Low
    const [userName, setUserName] = useState('');
    const [notifiedTasks, setNotifiedTasks] = useState(new Set());

    // SweetAlert State
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        type: 'success',
        title: '',
        message: '',
        showCancel: false,
        confirmText: 'OK',
        onConfirm: () => { },
        onCancel: () => { }
    });

    const fetchTasks = async () => {
        try {
            const response = await api.get('/tasks');
            setTasks(response.data || []);
        } catch (error) {
            if (error.response?.status === 401) {
                handleLogout();
            } else {
                console.error("Error fetching tasks:", error);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchProfile = async () => {
        try {
            const response = await api.get('/users/profile');
            if (response.data && response.data.fullName) {
                setUserName(response.data.fullName.split(' ')[0]); // Use first name
            }
        } catch (error) {
            console.error("Error fetching profile for name:", error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchTasks();
            fetchProfile();
        }, [])
    );

    useEffect(() => {
        const checkReminders = () => {
            const now = new Date();
            let taskReminderTriggered = false;
            let subtaskTriggerCount = 0;
            let lastTriggeredMessage = '';
            const newNotifiedKeys = [];

            const currentHours = now.getHours().toString().padStart(2, '0');
            const currentMinutes = now.getMinutes().toString().padStart(2, '0');
            const currentTime = `${currentHours}:${currentMinutes}`;

            tasks.forEach(task => {
                // High level task reminders
                if (task.reminder && task.reminderTime && !notifiedTasks.has(task.id)) {
                    const reminderDate = new Date(task.reminderTime);
                    const remHours = reminderDate.getHours().toString().padStart(2, '0');
                    const remMins = reminderDate.getMinutes().toString().padStart(2, '0');
                    const remTimeStr = `${remHours}:${remMins}`;

                    if (remTimeStr === currentTime && task.status !== 'Completed') {
                        const name = userName || 'User';
                        showAlert({
                            type: 'info',
                            title: 'Task Reminder! 🔔',
                            message: `${name}, your task "${task.title}" is coming closer!`
                        });
                        setNotifiedTasks(prev => new Set(prev).add(task.id));
                        taskReminderTriggered = true;
                    }
                }

                // Global Subtask Timing Check
                if (!taskReminderTriggered && task.subtasks && Array.isArray(task.subtasks) && task.status !== 'Completed') {
                    task.subtasks.forEach(st => {
                        const notifyKey = `subtask_${st.id}`;
                        if (!st.completed && st.timing && !notifiedTasks.has(notifyKey)) {
                            // Exact match requested by user
                            if (currentTime === st.timing) {
                                subtaskTriggerCount++;
                                lastTriggeredMessage = `It is time for your subtask: "${st.title}" (from task "${task.title}")`;
                                newNotifiedKeys.push(notifyKey);
                            }
                        }
                    });
                }
            });

            // If we found any subtasks to trigger, and we didn't just fire a main task alert
            if (!taskReminderTriggered && subtaskTriggerCount > 0) {
                if (newNotifiedKeys.length > 0) {
                    setNotifiedTasks(prev => {
                        const updatedSet = new Set(prev);
                        newNotifiedKeys.forEach(k => updatedSet.add(k));
                        return updatedSet;
                    });
                }
                if (subtaskTriggerCount === 1) {
                    showAlert({ type: 'info', title: 'Time Up! ⏰', message: lastTriggeredMessage });
                } else {
                    showAlert({ type: 'info', title: 'Time Up! ⏰', message: `It is time for ${subtaskTriggerCount} of your scheduled subtasks!` });
                }
            }
        };

        const interval = setInterval(checkReminders, 30000); // Check every 30 seconds
        return () => clearInterval(interval);
    }, [tasks, notifiedTasks, userName]);



    const onRefresh = () => {
        setRefreshing(true);
        fetchTasks();
    };

    const handleLogout = async () => {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userId');
        navigation.replace('Login');
    };

    const showAlert = (config) => {
        setAlertConfig({
            ...config,
            visible: true,
            onConfirm: () => {
                setAlertConfig(prev => ({ ...prev, visible: false }));
                if (config.onConfirm) config.onConfirm();
            },
            onCancel: () => {
                setAlertConfig(prev => ({ ...prev, visible: false }));
                if (config.onCancel) config.onCancel();
            }
        });
    };

    const toggleTaskStatus = async (task) => {
        const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
        try {
            await api.put(`/tasks/${task.id}`, { ...task, status: newStatus });
            setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
            if (newStatus === 'Completed') {
                showAlert({
                    type: 'success',
                    title: 'Task Completed',
                    message: `Your task "${task.title}" is completed successfully!`
                });
            }
        } catch (error) {
            showAlert({
                type: 'error',
                title: 'Update Failed',
                message: 'Could not update task status.'
            });
        }
    };

    const deleteTask = async (id) => {
        showAlert({
            type: 'warning',
            title: 'Delete Task?',
            message: 'This action cannot be undone. Are you sure?',
            showCancel: true,
            confirmText: 'Delete',
            onConfirm: async () => {
                try {
                    await api.delete(`/tasks/${id}`);
                    setTasks(tasks.filter(t => t.id !== id));
                    showAlert({
                        type: 'success',
                        title: 'Deleted',
                        message: 'Task has been removed.'
                    });
                } catch (error) {
                    showAlert({
                        type: 'error',
                        title: 'Error',
                        message: 'Failed to delete task.'
                    });
                }
            }
        });
    };

    const filteredTasks = tasks
        .filter(t => {
            if (filter === 'All') return true;
            return t.priority === filter;
        })
        .sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        });

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'High': return '#ef4444'; // Red
            case 'Medium': return '#f59e0b'; // Amber
            case 'Low': return '#10b981'; // Emerald
            default: return '#6b7280'; // Gray
        }
    };

    const formatDateTime = (isoString) => {
        if (!isoString) return '';
        try {
            const dateStr = isoString.split('T')[0];
            const timeStr = isoString.split('T')[1]?.substring(0, 5);
            return `${dateStr} @ ${timeStr}`;
        } catch (e) {
            return isoString;
        }
    };

    const renderTask = ({ item }) => (
        <View style={[styles.taskCard, item.status === 'Completed' && styles.taskCardCompleted]}>
            <TouchableOpacity
                style={styles.taskStatusBtn}
                onPress={() => toggleTaskStatus(item)}
            >
                {item.status === 'Completed' ? (
                    <CheckCircle2 color="#10b981" size={24} />
                ) : (
                    <Circle color="#8e8e93" size={24} />
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.taskContent}
                onPress={() => navigation.navigate('TaskDetail', { task: item, isEditing: false })}
            >
                <Text style={[styles.taskTitle, item.status === 'Completed' && styles.taskTitleCompleted]}>
                    {item.title}
                </Text>

                <View style={styles.taskMetaContainer}>
                    <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '15', borderColor: getPriorityColor(item.priority) + '30' }]}>
                        <AlertTriangle color={getPriorityColor(item.priority)} size={12} />
                        <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
                            {item.priority}
                        </Text>
                    </View>
                    {item.dueDate ? (
                        <View style={styles.dateBadge}>
                            <Clock color="#a1a1aa" size={12} />
                            <Text style={styles.dateText}>{formatDateTime(item.dueDate)}</Text>
                        </View>
                    ) : null}
                </View>

                {item.description ? (
                    <Text style={styles.taskDesc} numberOfLines={2}>{item.description}</Text>
                ) : null}

                {/* Task Feature Summary */}
                <View style={styles.summaryContainer}>
                    {item.subtaskCount > 0 && (
                        <View style={[styles.summaryBadge, item.completedSubtaskCount === item.subtaskCount && styles.summaryBadgeCompleted]}>
                            <CheckSquare color={item.completedSubtaskCount === item.subtaskCount ? "#10b981" : "#a1a1aa"} size={14} />
                            <Text style={[styles.summaryText, item.completedSubtaskCount === item.subtaskCount && { color: "#10b981" }]}>
                                {item.completedSubtaskCount}/{item.subtaskCount}
                            </Text>
                        </View>
                    )}
                    {item.commentCount > 0 && (
                        <View style={styles.summaryBadge}>
                            <MessageSquare color="#a1a1aa" size={14} />
                            <Text style={styles.summaryText}>{item.commentCount}</Text>
                        </View>
                    )}
                    {item.attachmentCount > 0 && (
                        <View style={styles.summaryBadge}>
                            <Paperclip color="#a1a1aa" size={14} />
                            <Text style={styles.summaryText}>{item.attachmentCount}</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>

            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('TaskDetail', { task: item, isEditing: true })}
                >
                    <Edit3 color="#a1a1aa" size={20} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => deleteTask(item.id)}
                >
                    <Trash2 color="#ef4444" size={20} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>My Tasks</Text>
                    <Text style={styles.subGreeting}>
                        You have {tasks.filter(t => t.status !== 'Completed').length} tasks pending
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity
                        style={[styles.logoutBtn, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}
                        onPress={() => navigation.navigate('Workout')}
                    >
                        <Activity color="#6366f1" size={22} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.logoutBtn, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}
                        onPress={() => navigation.navigate('Profile')}
                    >
                        <UserIcon color="#6366f1" size={22} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <LogOut color="#ef4444" size={22} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.filterContainer}>
                {['All', 'High', 'Medium', 'Low'].map((f) => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                            {f}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            ) : filteredTasks.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <AlertTriangle color="#3f3f46" size={48} />
                    <Text style={styles.emptyText}>No tasks found</Text>
                    <Text style={styles.emptySubText}>Create a new task to get started.</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredTasks}
                    keyExtractor={(item) => item.id}
                    renderItem={renderTask}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#6366f1"
                            colors={['#6366f1']}
                        />
                    }
                />
            )}

            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('TaskDetail')}
            >
                <Plus color="#ffffff" size={24} />
            </TouchableOpacity>

            <SweetAlert
                visible={alertConfig.visible}
                type={alertConfig.type}
                title={alertConfig.title}
                message={alertConfig.message}
                showCancel={alertConfig.showCancel}
                confirmText={alertConfig.confirmText}
                onConfirm={alertConfig.onConfirm}
                onCancel={alertConfig.onCancel}
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
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
    },
    greeting: {
        fontSize: 28,
        fontWeight: '800',
        color: '#ffffff',
    },
    subGreeting: {
        fontSize: 14,
        color: '#a1a1aa',
        marginTop: 4,
    },
    logoutBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 16,
        gap: 12,
    },
    filterBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#18181b',
        borderWidth: 1,
        borderColor: '#27272a',
    },
    filterBtnActive: {
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderColor: '#6366f1',
    },
    filterText: {
        color: '#a1a1aa',
        fontSize: 14,
        fontWeight: '600',
    },
    filterTextActive: {
        color: '#6366f1',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    taskCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#1c1c1e',
        borderRadius: 20,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    taskCardCompleted: {
        opacity: 0.5,
        backgroundColor: '#121214',
    },
    taskStatusBtn: {
        marginRight: 14,
        marginTop: 2,
    },
    taskContent: {
        flex: 1,
    },
    taskTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 8,
        letterSpacing: 0.3,
    },
    taskTitleCompleted: {
        textDecorationLine: 'line-through',
        color: '#71717a',
    },
    taskDesc: {
        fontSize: 14,
        color: '#a1a1aa',
        marginBottom: 12,
        lineHeight: 20,
    },
    taskMetaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 10,
    },
    priorityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        gap: 4,
    },
    priorityText: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        gap: 6,
    },
    dateText: {
        fontSize: 12,
        color: '#d4d4d8',
        fontWeight: '500',
    },
    summaryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 4,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    summaryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 6,
    },
    summaryBadgeCompleted: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
    },
    summaryText: {
        fontSize: 13,
        color: '#a1a1aa',
        fontWeight: '600',
    },
    actionButtons: {
        justifyContent: 'space-between',
        alignItems: 'center',
        marginLeft: 10,
        paddingLeft: 10,
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(255, 255, 255, 0.05)',
        height: '100%',
        paddingVertical: 4,
    },
    actionBtn: {
        padding: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 10,
        marginBottom: 8,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#ffffff',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 16,
        color: '#a1a1aa',
        textAlign: 'center',
    },
});
