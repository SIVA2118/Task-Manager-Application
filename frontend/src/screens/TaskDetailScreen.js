import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Platform,
    KeyboardAvoidingView,
    Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Save, Edit2, Calendar as CalendarIcon, Clock, Flag, Bell, CheckCircle2, Circle, MessageSquare, Paperclip, Plus, Send, Trash2 } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axiosConfig';
import SweetAlert from '../components/SweetAlert';

export default function TaskDetailScreen({ route, navigation }) {
    const { task: initialTask, isEditing: initialIsEditing } = route.params || { isEditing: false };
    const [currentTask, setCurrentTask] = useState(initialTask);
    const [loading, setLoading] = useState(false);
    const [isEditingMode, setIsEditingMode] = useState(initialIsEditing || !initialTask?.id);

    // Form State
    const [title, setTitle] = useState(initialTask?.title || '');
    const [description, setDescription] = useState(initialTask?.description || '');
    const [dueDate, setDueDate] = useState(initialTask?.dueDate ? initialTask.dueDate.split('T')[0] : '');
    const [dueTime, setDueTime] = useState(initialTask?.dueDate ? initialTask.dueDate.split('T')[1].substring(0, 5) : '12:00');
    const [priority, setPriority] = useState(initialTask?.priority || 'Medium');
    const [reminder, setReminder] = useState(initialTask?.reminder || false);

    // Sub-Features State
    const [subtasks, setSubtasks] = useState([]);
    const [comments, setComments] = useState([]);
    const [attachments, setAttachments] = useState([]);

    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [newSubtaskTiming, setNewSubtaskTiming] = useState('');
    const [newCommentContent, setNewCommentContent] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showSubtaskTimePicker, setShowSubtaskTimePicker] = useState(false);

    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        type: 'success',
        title: '',
        message: '',
        onConfirm: () => { }
    });

    useEffect(() => {
        if (currentTask?.id) {
            fetchSubFeatures();
        }
    }, [currentTask?.id]);

    const alertedSubtasks = React.useRef(new Set());
    const alertedMainTask = React.useRef(false);

    useEffect(() => {
        // Check for subtask timing alerts
        const interval = setInterval(() => {
            const now = new Date();
            const currentHours = now.getHours().toString().padStart(2, '0');
            const currentMinutes = now.getMinutes().toString().padStart(2, '0');
            const currentTime = `${currentHours}:${currentMinutes}`;

            let triggeredCount = 0;
            let lastTriggeredTitle = '';
            let mainTaskTriggered = false;

            // Check Main Task Reminder
            if (currentTask?.reminder && currentTask?.reminderTime && !alertedMainTask.current && currentTask?.status !== 'Completed') {
                const reminderDate = new Date(currentTask.reminderTime);
                const remHours = reminderDate.getHours().toString().padStart(2, '0');
                const remMins = reminderDate.getMinutes().toString().padStart(2, '0');
                const remTimeStr = `${remHours}:${remMins}`;

                if (remTimeStr === currentTime) {
                    alertedMainTask.current = true;
                    mainTaskTriggered = true;
                }
            }

            subtasks.forEach(st => {
                if (!st.completed && st.timing && !alertedSubtasks.current.has(st.id)) {
                    // Compare HH:MM strings directly for an exact time match
                    if (currentTime === st.timing) {
                        alertedSubtasks.current.add(st.id);
                        triggeredCount++;
                        lastTriggeredTitle = st.title;
                    }
                }
            });

            if (mainTaskTriggered && triggeredCount === 0) {
                showAlert('info', 'Task Reminder! 🔔', `Your task "${currentTask.title}" is coming closer!`);
            } else if (mainTaskTriggered && triggeredCount > 0) {
                showAlert('info', 'Time Up! ⏰', `It is time for task "${currentTask.title}" and ${triggeredCount} subtask(s)!`);
            } else if (triggeredCount === 1) {
                showAlert('info', 'Time Up! ⏰', `It is time for your subtask: "${lastTriggeredTitle}"`);
            } else if (triggeredCount > 1) {
                showAlert('info', 'Time Up! ⏰', `It is time for ${triggeredCount} of your scheduled subtasks!`);
            }
        }, 5000); // check every 5 seconds

        return () => clearInterval(interval);
    }, [subtasks, currentTask]);

    const fetchSubFeatures = async () => {
        try {
            const [stRes, commRes, attRes] = await Promise.all([
                api.get(`/tasks/${currentTask.id}/subtasks`),
                api.get(`/tasks/${currentTask.id}/comments`),
                api.get(`/tasks/${currentTask.id}/attachments`)
            ]);
            setSubtasks(stRes.data || []);
            setComments(commRes.data || []);
            setAttachments(attRes.data || []);
        } catch (error) {
            console.error("Error fetching sub-features:", error);
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

    // Handlers
    const addSubtask = async () => {
        if (!newSubtaskTitle.trim()) return;
        try {
            if (currentTask?.id) {
                const res = await api.post(`/tasks/${currentTask.id}/subtasks`, {
                    title: newSubtaskTitle,
                    completed: false,
                    timing: newSubtaskTiming
                });
                setSubtasks([...subtasks, res.data]);
            } else {
                setSubtasks([...subtasks, {
                    id: Date.now().toString(),
                    title: newSubtaskTitle,
                    completed: false,
                    timing: newSubtaskTiming
                }]);
            }
            setNewSubtaskTitle('');
            setNewSubtaskTiming('');
        } catch (error) {
            console.error("Error adding subtask:", error);
            showAlert('error', 'Error', 'Failed to save subtask.');
        }
    };

    const toggleSubtask = async (st) => {
        try {
            const newCompletedState = !st.completed;
            if (currentTask?.id) {
                const res = await api.put(`/tasks/${currentTask.id}/subtasks/${st.id}`, { ...st, completed: newCompletedState });
                setSubtasks(subtasks.map(s => s.id === st.id ? res.data : s));
            } else {
                setSubtasks(subtasks.map(s => s.id === st.id ? { ...s, completed: newCompletedState } : s));
            }
            if (newCompletedState) {
                showAlert('success', 'Subtask Completed', `Your subtask "${st.title}" is completed successfully!`);
            }
        } catch (error) {
            console.error("Error toggling subtask:", error);
        }
    };

    const deleteSubtask = async (id) => {
        try {
            if (currentTask?.id) await api.delete(`/tasks/${currentTask.id}/subtasks/${id}`);
            setSubtasks(subtasks.filter(s => s.id !== id));
        } catch (error) {
            console.error("Error deleting subtask:", error);
        }
    };

    const addComment = async () => {
        if (!newCommentContent.trim()) return;
        try {
            const username = await AsyncStorage.getItem('username') || 'User';
            const payload = { content: newCommentContent, username };
            if (currentTask?.id) {
                const res = await api.post(`/tasks/${currentTask.id}/comments`, payload);
                setComments([...comments, res.data]);
            } else {
                setComments([...comments, { id: Date.now().toString(), ...payload }]);
            }
            setNewCommentContent('');
        } catch (error) {
            console.error("Error adding comment:", error);
            showAlert('error', 'Error', 'Failed to save comment.');
        }
    };

    const deleteComment = async (id) => {
        try {
            if (currentTask?.id) await api.delete(`/tasks/${currentTask.id}/comments/${id}`);
            setComments(comments.filter(c => c.id !== id));
        } catch (error) {
            console.error("Error deleting comment:", error);
        }
    };

    const addAttachment = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
            if (result.canceled) return;
            const file = result.assets[0];
            const payload = { fileName: file.name, fileUrl: file.uri, fileType: file.mimeType || 'application/octet-stream' };
            if (currentTask?.id) {
                const res = await api.post(`/tasks/${currentTask.id}/attachments`, payload);
                setAttachments([...attachments, res.data]);
            } else {
                setAttachments([...attachments, { id: Date.now().toString(), ...payload }]);
            }
        } catch (error) {
            console.error("Error picking document:", error);
        }
    };

    const deleteAttachment = async (id) => {
        try {
            if (currentTask?.id) await api.delete(`/tasks/${currentTask.id}/attachments/${id}`);
            setAttachments(attachments.filter(a => a.id !== id));
        } catch (error) {
            console.error("Error deleting attachment:", error);
        }
    };

    const openAttachment = async (attachment) => {
        try {
            if (!attachment.fileUrl) {
                showAlert('error', 'Error', 'No file URI found for this attachment.');
                return;
            }

            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
                await Sharing.shareAsync(attachment.fileUrl);
            } else {
                showAlert('error', 'Not Supported', 'Sharing/Viewing files is not supported on this platform.');
            }
        } catch (error) {
            console.error("Error opening attachment:", error);
            showAlert('error', 'Error', 'Could not open the file.');
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            showAlert('warning', 'Missing Title', 'Please enter a task title.');
            return;
        }
        setLoading(true);
        try {
            const payload = {
                title, description, priority, reminder,
                dueDate: dueDate ? `${dueDate}T${dueTime}:00` : null,
                reminderTime: (reminder && dueDate) ? `${dueDate}T${dueTime}:00` : null,
                status: currentTask?.status || 'Pending'
            };
            if (currentTask?.id) {
                // If there's unsaved input typed in the box, save it too
                if (newSubtaskTitle.trim()) {
                    await api.post(`/tasks/${currentTask.id}/subtasks`, { title: newSubtaskTitle, completed: false, timing: newSubtaskTiming });
                    setNewSubtaskTitle('');
                    setNewSubtaskTiming('');
                }
                if (newCommentContent.trim()) {
                    const username = await AsyncStorage.getItem('username') || 'User';
                    await api.post(`/tasks/${currentTask.id}/comments`, { content: newCommentContent, username });
                    setNewCommentContent('');
                }

                await api.put(`/tasks/${currentTask.id}`, payload);
                showAlert('success', 'Success', 'Task updated successfully!', () => navigation.goBack());
            } else {
                const res = await api.post('/tasks', payload);
                const newTask = res.data;

                const pendingSubtasks = [...subtasks];
                const pendingComments = [...comments];

                if (newSubtaskTitle.trim()) {
                    pendingSubtasks.push({ title: newSubtaskTitle, completed: false, timing: newSubtaskTiming });
                }
                if (newCommentContent.trim()) {
                    const username = await AsyncStorage.getItem('username') || 'User';
                    pendingComments.push({ content: newCommentContent, username });
                }

                // Save any locally added sub-features
                if (pendingSubtasks.length > 0 || pendingComments.length > 0 || attachments.length > 0) {
                    await Promise.all([
                        ...pendingSubtasks.map(sh => api.post(`/tasks/${newTask.id}/subtasks`, sh)),
                        ...pendingComments.map(c => api.post(`/tasks/${newTask.id}/comments`, c)),
                        ...attachments.map(a => api.post(`/tasks/${newTask.id}/attachments`, a))
                    ]);
                }

                setCurrentTask(newTask);
                showAlert('success', 'Success', 'Task created successfully!', () => navigation.goBack());
            }
        } catch (error) {
            console.error("Error saving task:", error);
            showAlert('error', 'Error', 'Failed to save task.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (isoString) => {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return isoString;
        }
    };

    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) setDueDate(selectedDate.toISOString().split('T')[0]);
    };

    const onTimeChange = (event, selectedTime) => {
        setShowTimePicker(false);
        if (selectedTime) setDueTime(selectedTime.toTimeString().substring(0, 5));
    };

    const onSubtaskTimeChange = (event, selectedTime) => {
        setShowSubtaskTimePicker(false);
        if (selectedTime) {
            setNewSubtaskTiming(selectedTime.toTimeString().substring(0, 5));
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ArrowLeft color="#ffffff" size={24} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{isEditingMode ? (currentTask?.id ? 'Edit Task' : 'New Task') : 'Task Details'}</Text>
                    {currentTask?.id && !isEditingMode ? (
                        <TouchableOpacity onPress={() => setIsEditingMode(true)} style={styles.backBtn}>
                            <Edit2 color="#6366f1" size={22} />
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 44 }} />
                    )}
                </View>

                <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                    <View style={styles.section}>
                        <Text style={[styles.label, { marginBottom: 8 }]}>Task Title</Text>
                        {isEditingMode ? (
                            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor="#8e8e93" />
                        ) : (
                            <Text style={styles.viewText}>{title || 'No Title'}</Text>
                        )}
                    </View>

                    <View style={styles.section}>
                        <Text style={[styles.label, { marginBottom: 8 }]}>Description</Text>
                        {isEditingMode ? (
                            <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Details" placeholderTextColor="#8e8e93" multiline numberOfLines={4} />
                        ) : (
                            <Text style={styles.viewText}>{description || 'No description provided'}</Text>
                        )}
                    </View>

                    <View style={styles.section}>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Date</Text>
                                <TouchableOpacity style={styles.inputContainer} onPress={() => setShowDatePicker(true)}>
                                    <CalendarIcon color="#8e8e93" size={20} />
                                    <Text style={{ color: '#ffffff', marginLeft: 8 }}>{dueDate || 'Set Date'}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Time</Text>
                                <TouchableOpacity style={styles.inputContainer} onPress={() => setShowTimePicker(true)}>
                                    <Clock color="#8e8e93" size={20} />
                                    <Text style={{ color: '#ffffff', marginLeft: 8 }}>{dueTime}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <CheckCircle2 color="#a1a1aa" size={18} />
                            <Text style={styles.label}>SubTasks ({subtasks.filter(s => s.completed).length}/{subtasks.length})</Text>
                        </View>
                        {subtasks.map(st => (
                            <View key={st.id} style={styles.itemRow}>
                                <TouchableOpacity onPress={() => toggleSubtask(st)}>{st.completed ? <CheckCircle2 color="#10b981" size={20} /> : <Circle color="#8e8e93" size={20} />}</TouchableOpacity>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={[styles.itemText, st.completed && { textDecorationLine: 'line-through', color: '#71717a' }]}>{st.title}</Text>
                                        {st.timing && <View style={styles.timeBadgeSmall}><Clock color="#6366f1" size={10} /><Text style={styles.timeBadgeTextSmall}>{st.timing}</Text></View>}
                                    </View>
                                    <Text style={styles.itemMeta}>
                                        {st.username ? `${st.username} • ` : ''}{st.createdAt ? `${formatDate(st.createdAt)}` : ''}
                                    </Text>
                                </View>
                                {isEditingMode && (
                                    <TouchableOpacity onPress={() => deleteSubtask(st.id)}><Trash2 color="#ef4444" size={16} /></TouchableOpacity>
                                )}
                            </View>
                        ))}
                        {isEditingMode && (
                            <View style={styles.addInputRow}>
                                <View style={styles.inputStack}>
                                    <TextInput
                                        style={styles.inlineInput}
                                        value={newSubtaskTitle}
                                        onChangeText={setNewSubtaskTitle}
                                        placeholder="Subtask name"
                                        placeholderTextColor="#71717a"
                                    />
                                    <TouchableOpacity style={styles.timingInputRow} onPress={() => setShowSubtaskTimePicker(true)}>
                                        <Clock color="#71717a" size={14} />
                                        <Text style={[styles.timingInput, { color: newSubtaskTiming ? '#ffffff' : '#71717a' }]}>
                                            {newSubtaskTiming || 'Set Timing'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity onPress={addSubtask} style={styles.smallAddBtn}>
                                    <Plus color="#ffffff" size={20} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <MessageSquare color="#a1a1aa" size={18} />
                            <Text style={styles.label}>Comments ({comments.length})</Text>
                        </View>
                        {comments.map(c => (
                            <View key={c.id} style={styles.commentRow}>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={styles.commentUser}>{c.username}</Text>
                                        <Text style={styles.itemMeta}>{formatDate(c.createdAt)}</Text>
                                    </View>
                                    <Text style={styles.commentText}>{c.content}</Text>
                                </View>
                                {isEditingMode && (
                                    <TouchableOpacity onPress={() => deleteComment(c.id)}><Trash2 color="#ef4444" size={14} /></TouchableOpacity>
                                )}
                            </View>
                        ))}
                        {isEditingMode && (
                            <View style={styles.addInputRow}>
                                <TextInput style={styles.inlineInput} value={newCommentContent} onChangeText={setNewCommentContent} placeholder="Add comment" placeholderTextColor="#71717a" />
                                <TouchableOpacity onPress={addComment} style={styles.smallAddBtn}><Send color="#ffffff" size={18} /></TouchableOpacity>
                            </View>
                        )}
                    </View>

                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Paperclip color="#a1a1aa" size={18} />
                            <Text style={styles.label}>Attachments ({attachments.length})</Text>
                        </View>
                        {attachments.map(a => (
                            <TouchableOpacity key={a.id} style={styles.itemRow} onPress={() => openAttachment(a)}>
                                <Paperclip color="#6366f1" size={16} />
                                <View style={{ flex: 1, marginHorizontal: 8 }}>
                                    <Text style={{ color: '#ffffff' }} numberOfLines={1}>{a.fileName}</Text>
                                    <Text style={styles.itemMeta}>{a.fileType?.split('/')[1]?.toUpperCase() || 'FILE'} • {formatDate(a.createdAt)}</Text>
                                </View>
                                {isEditingMode && (
                                    <TouchableOpacity onPress={() => deleteAttachment(a.id)}><Trash2 color="#ef4444" size={16} /></TouchableOpacity>
                                )}
                            </TouchableOpacity>
                        ))}
                        {isEditingMode && (
                            <TouchableOpacity style={styles.uploadBtn} onPress={addAttachment}>
                                <Plus color="#6366f1" size={18} />
                                <Text style={styles.uploadBtnText}>Add Any File</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Priority & Reminder */}
                    <View style={styles.section}>
                        <Text style={[styles.label, { marginBottom: 10 }]}>Priority</Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            {['High', 'Medium', 'Low'].map(p => (
                                <TouchableOpacity key={p} onPress={() => setPriority(p)} style={[styles.priorityBtn, priority === p && { borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                                    <Text style={{ color: priority === p ? '#6366f1' : '#a1a1aa' }}>{p}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.section}>
                        <View style={styles.switchRow}>
                            <View><Text style={{ color: '#ffffff', fontSize: 16 }}>Reminder</Text><Text style={{ color: '#a1a1aa', fontSize: 12 }}>In-app notification</Text></View>
                            <Switch value={reminder} onValueChange={setReminder} trackColor={{ false: '#27272a', true: '#6366f1' }} />
                        </View>
                    </View>
                </ScrollView>

                {isEditingMode && (
                    <View style={styles.footer}>
                        <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={loading}>
                            {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.saveBtnText}>Save Task</Text>}
                        </TouchableOpacity>
                    </View>
                )}
            </KeyboardAvoidingView>

            {showDatePicker && <DateTimePicker value={new Date()} mode="date" onChange={onDateChange} />}
            {showTimePicker && <DateTimePicker value={new Date()} mode="time" is24Hour onChange={onTimeChange} />}
            {showSubtaskTimePicker && <DateTimePicker value={new Date()} mode="time" is24Hour onChange={onSubtaskTimeChange} />}
            <SweetAlert visible={alertConfig.visible} type={alertConfig.type} title={alertConfig.title} message={alertConfig.message} onConfirm={alertConfig.onConfirm} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0c' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#18181b' },
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
    content: { flex: 1, padding: 20 },
    section: { marginBottom: 32 },
    label: { fontSize: 13, color: '#a1a1aa', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { backgroundColor: '#18181b', borderRadius: 12, padding: 14, color: '#ffffff', borderWidth: 1, borderColor: '#27272a' },
    textArea: { height: 100, textAlignVertical: 'top' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#27272a' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
    itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', padding: 12, borderRadius: 12, marginBottom: 8, gap: 12 },
    itemText: { flex: 1, color: '#ffffff' },
    itemMeta: { fontSize: 11, color: '#71717a', marginTop: 2 },
    timeBadgeSmall: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(99, 102, 241, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    timeBadgeTextSmall: { fontSize: 10, color: '#6366f1', fontWeight: '600' },
    addInputRow: { flexDirection: 'row', gap: 10, marginTop: 4, alignItems: 'center' },
    inputStack: { flex: 1, gap: 6 },
    timingInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#18181b', borderRadius: 8, paddingHorizontal: 10, height: 32, borderWidth: 1, borderColor: '#27272a' },
    timingInput: { flex: 1, color: '#ffffff', fontSize: 12, padding: 0 },
    inlineInput: { flex: 1, backgroundColor: '#18181b', borderRadius: 10, padding: 10, color: '#ffffff', fontSize: 14, borderWidth: 1, borderColor: '#27272a' },
    smallAddBtn: { width: 44, height: 44, backgroundColor: '#6366f1', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    commentRow: { backgroundColor: '#18181b', padding: 12, borderRadius: 12, marginBottom: 8, flexDirection: 'row', gap: 12, alignItems: 'center' },
    commentUser: { fontSize: 12, color: '#6366f1', fontWeight: 'bold' },
    commentText: { color: '#ffffff', marginTop: 2 },
    uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#6366f1', borderRadius: 12, justifyContent: 'center' },
    uploadBtnText: { color: '#6366f1', fontWeight: '600' },
    priorityBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#27272a', alignItems: 'center' },
    viewText: { color: '#ffffff', fontSize: 16, backgroundColor: '#18181b', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#27272a' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#18181b' },
    saveBtn: { backgroundColor: '#6366f1', height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    saveBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' }
});
