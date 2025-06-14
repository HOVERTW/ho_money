/**
 * 診斷按鈕組件
 * 用戶可以點擊運行診斷測試
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { diagnosticTool, DiagnosticResult } from '../utils/diagnostics';

interface DiagnosticButtonProps {
  style?: any;
}

export const DiagnosticButton: React.FC<DiagnosticButtonProps> = ({ style }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);

  const runDiagnostics = async () => {
    try {
      setIsRunning(true);
      console.log('🔍 用戶啟動診斷測試...');
      
      const diagnosticResults = await diagnosticTool.runAllTests();
      setResults(diagnosticResults);
      setShowResults(true);
      
      console.log('✅ 診斷測試完成');
    } catch (error) {
      console.error('❌ 診斷測試失敗:', error);
      Alert.alert('診斷失敗', `診斷測試過程中發生錯誤: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const autoFix = async () => {
    try {
      console.log('🔧 用戶啟動自動修復...');
      
      const fixes = await diagnosticTool.autoFix();
      
      if (fixes.length > 0) {
        Alert.alert(
          '自動修復完成',
          `已完成以下修復:\n${fixes.join('\n')}`,
          [
            {
              text: '重新診斷',
              onPress: runDiagnostics
            },
            {
              text: '確定',
              style: 'default'
            }
          ]
        );
      } else {
        Alert.alert('自動修復', '沒有發現需要修復的問題');
      }
      
      console.log('✅ 自動修復完成');
    } catch (error) {
      console.error('❌ 自動修復失敗:', error);
      Alert.alert('修復失敗', `自動修復過程中發生錯誤: ${error.message}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />;
      case 'fail':
        return <Ionicons name="close-circle" size={20} color="#F44336" />;
      case 'warning':
        return <Ionicons name="warning" size={20} color="#FF9800" />;
      default:
        return <Ionicons name="help-circle" size={20} color="#9E9E9E" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return '#4CAF50';
      case 'fail':
        return '#F44336';
      case 'warning':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const generateReport = () => {
    const report = diagnosticTool.generateReport();
    Alert.alert(
      '診斷報告',
      report,
      [
        {
          text: '複製報告',
          onPress: () => {
            // 這裡可以添加複製到剪貼板的功能
            console.log('📋 診斷報告:', report);
          }
        },
        {
          text: '關閉',
          style: 'cancel'
        }
      ],
      { cancelable: true }
    );
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.diagnosticButton, style]}
        onPress={runDiagnostics}
        disabled={isRunning}
      >
        <Ionicons 
          name={isRunning ? "sync" : "medical"} 
          size={20} 
          color="#FFFFFF" 
          style={isRunning ? styles.spinning : undefined}
        />
        <Text style={styles.diagnosticButtonText}>
          {isRunning ? '診斷中...' : '系統診斷'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showResults}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowResults(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>診斷結果</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowResults(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.resultsContainer}>
            {results.map((result, index) => (
              <View key={index} style={styles.resultItem}>
                <View style={styles.resultHeader}>
                  {getStatusIcon(result.status)}
                  <Text style={styles.resultCategory}>{result.category}</Text>
                </View>
                <Text style={styles.resultTest}>{result.test}</Text>
                <Text style={[styles.resultMessage, { color: getStatusColor(result.status) }]}>
                  {result.message}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={autoFix}
            >
              <Ionicons name="build" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>自動修復</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.reportButton]}
              onPress={generateReport}
            >
              <Ionicons name="document-text" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>生成報告</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.retestButton]}
              onPress={runDiagnostics}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>重新測試</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  diagnosticButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  diagnosticButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  spinning: {
    // 這裡可以添加旋轉動畫
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  resultItem: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultCategory: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333',
  },
  resultTest: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  resultMessage: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  reportButton: {
    backgroundColor: '#FF9800',
  },
  retestButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});
