import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { X, History, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ActivityLogManagerProps {
  onClose: () => void;
}

export const ActivityLogManager: React.FC<ActivityLogManagerProps> = ({ onClose }) => {
  const logs = useLiveQuery(() => db.activityLog.orderBy('timestamp').reverse().limit(100).toArray(), []) || [];

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-[32px] w-full max-w-lg h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        
        <div className="flex justify-between items-center p-6 border-b border-border bg-card z-10">
          <div className="flex items-center gap-3">
             <History className="text-accent" size={24} />
             <h2 className="text-xl font-bold text-foreground">سجل النشاطات الأخيرة</h2>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
              <Activity size={48} className="mb-4 opacity-20" />
              <p>لا يوجد نشاط مسجل حتى الآن.</p>
            </div>
          ) : (
            <AnimatePresence>
              {logs.map((log, i) => {
                const isDelete = log.action === 'delete';
                const isAdd = log.action === 'add';
                const isEdit = log.action === 'edit';
                
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    key={log.id} 
                    className={`p-4 rounded-2xl border flex gap-3 items-start ${
                      isDelete ? 'bg-rose-500/5 border-rose-500/10' : 
                      isAdd ? 'bg-emerald-500/5 border-emerald-500/10' : 
                      isEdit ? 'bg-blue-500/5 border-blue-500/10' : 
                      'bg-muted/50 border-border'
                    }`}
                  >
                    <div className="mt-1 w-2 h-2 rounded-full bg-accent shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{log.details}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                        {format(new Date(log.timestamp), 'PP pp', { locale: ar })}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
};
