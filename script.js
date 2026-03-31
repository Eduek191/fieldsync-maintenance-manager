// Field Maintenance Manager - Complete Application
const MaintenanceApp = {
    equipment: [],
    maintenance: [],
    
    init() {
        this.loadData();
        this.setupEventListeners();
        this.render();
    },
    
    // Data Management
    loadData() {
        const stored = localStorage.getItem('fieldMaintenanceData');
        if (stored) {
            const data = JSON.parse(stored);
            this.equipment = data.equipment || [];
            this.maintenance = data.maintenance || [];
        }
    },
    
    saveData() {
        localStorage.setItem('fieldMaintenanceData', JSON.stringify({
            equipment: this.equipment,
            maintenance: this.maintenance
        }));
    },
    
    // Equipment Management
    addEquipment(data) {
        const equipment = {
            id: Date.now().toString(),
            ...data,
            status: 'Operational',
            createdAt: new Date().toISOString(),
            lastMaintenance: null
        };
        this.equipment.push(equipment);
        this.saveData();
        return equipment;
    },
    
    deleteEquipment(id) {
        this.equipment = this.equipment.filter(e => e.id !== id);
        this.maintenance = this.maintenance.filter(m => m.equipmentId !== id);
        this.saveData();
    },
    
    updateEquipmentStatus(id, status) {
        const equip = this.equipment.find(e => e.id === id);
        if (equip) {
            equip.status = status;
            this.saveData();
        }
    },
    
    // Maintenance Management
    addMaintenance(data) {
        const record = {
            id: Date.now().toString(),
            ...data,
            createdAt: new Date().toISOString()
        };
        this.maintenance.push(record);
        
        // Update equipment last maintenance
        const equip = this.equipment.find(e => e.id === data.equipmentId);
        if (equip) {
            equip.lastMaintenance = new Date().toISOString();
        }
        
        this.saveData();
        return record;
    },
    
    deleteMaintenance(id) {
        this.maintenance = this.maintenance.filter(m => m.id !== id);
        this.saveData();
    },
    
    getMaintenanceByEquipment(equipmentId) {
        return this.maintenance
            .filter(m => m.equipmentId === equipmentId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    
    // Statistics
    getStats() {
        const total = this.equipment.length;
        const operational = this.equipment.filter(e => e.status === 'Operational').length;
        const pending = this.equipment.filter(e => e.status === 'Maintenance Due').length;
        const critical = this.equipment.filter(e => e.status === 'Critical').length;
        const scheduled = this.equipment.filter(e => this.isMaintenanceDue(e)).length;
        const uptime = total > 0 ? Math.round((operational / total) * 100) : 0;
        
        return { total, operational, pending, critical, scheduled, uptime };
    },
    
    isMaintenanceDue(equip) {
        if (!equip.lastMaintenance || !equip.maintenanceInterval) return false;
        const lastDate = new Date(equip.lastMaintenance);
        const nextDue = new Date(lastDate.getTime() + equip.maintenanceInterval * 24 * 60 * 60 * 1000);
        return new Date() >= nextDue;
    },
    
    getUpcomingMaintenance() {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        
        return this.equipment
            .filter(e => {
                if (!e.lastMaintenance) return false;
                const lastDate = new Date(e.lastMaintenance);
                const nextDue = new Date(lastDate.getTime() + e.maintenanceInterval * 24 * 60 * 60 * 1000);
                return nextDue <= thirtyDaysFromNow && nextDue >= new Date();
            })
            .map(e => {
                const lastDate = new Date(e.lastMaintenance);
                const nextDue = new Date(lastDate.getTime() + e.maintenanceInterval * 24 * 60 * 60 * 1000);
                const daysUntil = Math.ceil((nextDue - new Date()) / (1000 * 60 * 60 * 24));
                return { equipment: e, nextDue, daysUntil };
            })
            .sort((a, b) => a.daysUntil - b.daysUntil);
    },
    
    getAlerts() {
        const alerts = [];
        this.equipment.forEach(e => {
            if (e.status === 'Critical') {
                alerts.push({
                    type: 'danger',
                    icon: 'fas fa-exclamation-circle',
                    title: 'Critical Equipment',
                    message: `${e.name} requires immediate attention`
                });
            }
            if (this.isMaintenanceDue(e)) {
                const lastDate = new Date(e.lastMaintenance);
                const nextDue = new Date(lastDate.getTime() + e.maintenanceInterval * 24 * 60 * 60 * 1000);
                const daysOverdue = Math.ceil((new Date() - nextDue) / (1000 * 60 * 60 * 24));
                if (daysOverdue > 0) {
                    alerts.push({
                        type: 'warning',
                        icon: 'fas fa-clock',
                        title: 'Overdue Maintenance',
                        message: `${e.name} is ${daysOverdue} day(s) overdue for maintenance`
                    });
                }
            }
        });
        return alerts;
    },
    
    // Rendering
    render() {
        this.renderDashboard();
        this.renderEquipmentList();
        this.renderMaintenanceForm();
        this.renderMaintenanceHistory();
    },
    
    renderDashboard() {
        const stats = this.getStats();
        document.getElementById('stat-total').textContent = stats.total;
        document.getElementById('stat-operational').textContent = stats.operational;
        document.getElementById('stat-pending').textContent = stats.pending;
        document.getElementById('stat-critical').textContent = stats.critical;
        document.getElementById('stat-scheduled').textContent = stats.scheduled;
        document.getElementById('stat-uptime').textContent = stats.uptime + '%';
        
        // Render alerts
        const alertsContainer = document.getElementById('alerts-container');
        const alerts = this.getAlerts();
        if (alerts.length === 0) {
            alertsContainer.innerHTML = `
                <div class="alert alert-success">
                    <div class="alert-icon"><i class="fas fa-check-circle"></i></div>
                    <div>All systems operational. No critical alerts.</div>
                </div>
            `;
        } else {
            alertsContainer.innerHTML = alerts.map(alert => `
                <div class="alert alert-${alert.type}">
                    <div class="alert-icon"><i class="${alert.icon}"></i></div>
                    <div><strong>${alert.title}:</strong> ${alert.message}</div>
                </div>
            `).join('');
        }
        
        // Render upcoming maintenance
        const upcomingContainer = document.getElementById('upcoming-container');
        const upcoming = this.getUpcomingMaintenance();
        if (upcoming.length === 0) {
            upcomingContainer.innerHTML = `
                <div class="alert alert-info">
                    <div class="alert-icon"><i class="fas fa-info-circle"></i></div>
                    <div>No maintenance scheduled for the next 30 days.</div>
                </div>
            `;
        } else {
            upcomingContainer.innerHTML = upcoming.map(item => `
                <div class="equipment-item">
                    <div class="equipment-header">
                        <div class="equipment-info">
                            <h3>${item.equipment.name}</h3>
                            <p>${item.equipment.type} - ${item.equipment.location}</p>
                        </div>
                        <span class="status-badge status-scheduled">
                            <i class="fas fa-calendar"></i> ${item.daysUntil} days
                        </span>
                    </div>
                    <div class="equipment-meta">
                        <div class="meta-item">
                            <strong>Next Due:</strong>
                            <span>${item.nextDue.toLocaleDateString()}</span>
                        </div>
                        <div class="meta-item">
                            <strong>Interval:</strong>
                            <span>${item.equipment.maintenanceInterval} days</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    },
    
    renderEquipmentList() {
        const container = document.getElementById('equipment-list');
        
        if (this.equipment.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 40px 20px;">No equipment registered yet. Add equipment to get started.</p>';
            return;
        }
        
        container.innerHTML = this.equipment.map(e => {
            const isCritical = e.critical ? ' (CRITICAL)' : '';
            const statusColor = e.status === 'Operational' ? 'status-operational' : 
                              e.status === 'Maintenance Due' ? 'status-maintenance' : 'status-critical';
            const maintenanceHistory = this.getMaintenanceByEquipment(e.id);
            const lastMaint = maintenanceHistory.length > 0 ? new Date(maintenanceHistory[0].createdAt).toLocaleDateString() : 'Never';
            
            return `
                <div class="equipment-item">
                    <div class="equipment-header">
                        <div class="equipment-info">
                            <h3>${e.name}${isCritical}</h3>
                            <p>${e.type} - ${e.location}</p>
                        </div>
                        <span class="status-badge ${statusColor}">
                            <i class="fas fa-check-circle"></i> ${e.status}
                        </span>
                    </div>
                    <div class="equipment-meta">
                        <div class="meta-item">
                            <strong>Serial:</strong>
                            <span>${e.serial || 'N/A'}</span>
                        </div>
                        <div class="meta-item">
                            <strong>Installed:</strong>
                            <span>${new Date(e.installDate).toLocaleDateString()}</span>
                        </div>
                        <div class="meta-item">
                            <strong>Interval:</strong>
                            <span>${e.maintenanceInterval} days</span>
                        </div>
                        <div class="meta-item">
                            <strong>Last Maint:</strong>
                            <span>${lastMaint}</span>
                        </div>
                    </div>
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #f3f4f6;">
                        <div class="btn-group">
                            <button class="btn btn-sm btn-primary" onclick="MaintenanceApp.viewEquipmentDetails('${e.id}')">
                                <i class="fas fa-eye"></i> View Details
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="MaintenanceApp.deleteEquipment('${e.id}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },
    
    viewEquipmentDetails(equipmentId) {
        const equip = this.equipment.find(e => e.id === equipmentId);
        if (!equip) return;
        
        const history = this.getMaintenanceByEquipment(equipmentId);
        const modal = document.getElementById('equipment-modal');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');
        
        title.textContent = `${equip.name} - Maintenance History`;
        
        let historyHTML = '';
        if (history.length === 0) {
            historyHTML = '<p style="color: #9ca3af; text-align: center; padding: 20px;">No maintenance records yet.</p>';
        } else {
            historyHTML = `<div class="timeline">` + history.map(m => `
                <div class="timeline-item ${m.status === 'Completed' ? 'completed' : ''}">
                    <div class="timeline-item-date">${new Date(m.createdAt).toLocaleDateString()}</div>
                    <div class="timeline-item-content">
                        <strong>${m.type}</strong> - ${m.status}
                        <p style="margin-top: 4px; font-size: 0.9rem;">${m.details}</p>
                        ${m.technician ? `<p style="margin-top: 4px; font-size: 0.85rem; color: #6b7280;">Performed by: ${m.technician}</p>` : ''}
                        ${m.duration ? `<p style="margin-top: 4px; font-size: 0.85rem; color: #6b7280;">Duration: ${m.duration} hours</p>` : ''}
                    </div>
                </div>
            `).join('') + `</div>`;
        }
        
        body.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 12px; color: #1f2937;">Equipment Information</h3>
                <div class="equipment-meta">
                    <div class="meta-item">
                        <strong>Type:</strong>
                        <span>${equip.type}</span>
                    </div>
                    <div class="meta-item">
                        <strong>Location:</strong>
                        <span>${equip.location}</span>
                    </div>
                    <div class="meta-item">
                        <strong>Serial:</strong>
                        <span>${equip.serial || 'N/A'}</span>
                    </div>
                    <div class="meta-item">
                        <strong>Critical:</strong>
                        <span>${equip.critical ? 'Yes' : 'No'}</span>
                    </div>
                    <div class="meta-item">
                        <strong>Status:</strong>
                        <span>${equip.status}</span>
                    </div>
                    <div class="meta-item">
                        <strong>Maintenance Interval:</strong>
                        <span>${equip.maintenanceInterval} days</span>
                    </div>
                </div>
                ${equip.notes ? `<p style="margin-top: 12px; color: #6b7280;"><strong>Notes:</strong> ${equip.notes}</p>` : ''}
            </div>
            <div>
                <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 12px; color: #1f2937;">Maintenance History</h3>
                ${historyHTML}
            </div>
        `;
        
        modal.classList.add('active');
    },
    
    renderMaintenanceForm() {
        const select = document.getElementById('maint-equipment');
        select.innerHTML = '<option value="">Select Equipment</option>' +
            this.equipment.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
    },
    
    renderMaintenanceHistory() {
        const container = document.getElementById('maintenance-history');
        
        if (this.maintenance.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 40px 20px;">No maintenance records yet.</p>';
            return;
        }
        
        const sorted = [...this.maintenance].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        container.innerHTML = `<div class="timeline">` + sorted.map(m => {
            const equip = this.equipment.find(e => e.id === m.equipmentId);
            const isCompleted = m.status === 'Completed';
            
            return `
                <div class="timeline-item ${isCompleted ? 'completed' : ''}">
                    <div class="timeline-item-date">${new Date(m.createdAt).toLocaleDateString()}</div>
                    <div class="timeline-item-content">
                        <strong>${equip ? equip.name : 'Unknown'} - ${m.type}</strong>
                        <p style="margin: 4px 0;">Status: <span class="status-badge ${
                            m.status === 'Completed' ? 'status-operational' : 'status-scheduled'
                        }" style="margin-left: 4px;">${m.status}</span></p>
                        <p style="margin: 4px 0; font-size: 0.9rem;">${m.details}</p>
                        ${m.technician ? `<p style="margin: 4px 0; font-size: 0.85rem; color: #6b7280;">Technician: ${m.technician}</p>` : ''}
                        ${m.duration ? `<p style="margin: 4px 0; font-size: 0.85rem; color: #6b7280;">Duration: ${m.duration} hours</p>` : ''}
                    </div>
                    <button class="btn btn-sm btn-danger" style="margin-top: 8px;" onclick="MaintenanceApp.deleteMaintenance('${m.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            `;
        }).join('') + `</div>`;
    },
    
    // Event Handlers
    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                e.target.closest('.tab-btn').classList.add('active');
                const tabId = e.target.closest('.tab-btn').getAttribute('data-tab');
                document.getElementById(tabId).classList.add('active');
            });
        });
        
        // Equipment form
        document.getElementById('equipment-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const equipment = {
                name: document.getElementById('equip-name').value,
                type: document.getElementById('equip-type').value,
                installDate: document.getElementById('equip-install-date').value,
                serial: document.getElementById('equip-serial').value,
                location: document.getElementById('equip-location').value,
                maintenanceInterval: parseInt(document.getElementById('equip-interval').value),
                critical: document.getElementById('equip-critical').checked,
                notes: document.getElementById('equip-notes').value
            };
            
            this.addEquipment(equipment);
            document.getElementById('equipment-form').reset();
            this.renderEquipmentList();
            this.renderMaintenanceForm();
            alert('Equipment registered successfully!');
        });
        
        // Maintenance form
        document.getElementById('maintenance-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const maintenance = {
                equipmentId: document.getElementById('maint-equipment').value,
                type: document.getElementById('maint-type').value,
                date: document.getElementById('maint-date').value,
                technician: document.getElementById('maint-technician').value,
                status: document.getElementById('maint-status').value,
                duration: document.getElementById('maint-duration').value || 0,
                details: document.getElementById('maint-details').value,
                nextDate: document.getElementById('maint-next').value
            };
            
            this.addMaintenance(maintenance);
            document.getElementById('maintenance-form').reset();
            this.renderMaintenanceHistory();
            this.renderDashboard();
            alert('Maintenance logged successfully!');
        });
        
        // Modal close
        document.getElementById('equipment-modal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('equipment-modal')) {
                this.closeModal();
            }
        });
    },
    
    closeModal() {
        document.getElementById('equipment-modal').classList.remove('active');
    }
};

// Report Generation
function generateReport() {
    const reportType = document.getElementById('report-type').value;
    const preview = document.getElementById('report-preview');
    const stats = MaintenanceApp.getStats();
    
    let reportHTML = '';
    
    if (reportType === 'equipment-status') {
        reportHTML = `
            <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 12px;">Equipment Status Overview</h3>
            <div class="equipment-meta" style="margin-bottom: 20px;">
                <div class="meta-item">
                    <strong>Total Equipment:</strong>
                    <span>${stats.total}</span>
                </div>
                <div class="meta-item">
                    <strong>Operational:</strong>
                    <span>${stats.operational}</span>
                </div>
                <div class="meta-item">
                    <strong>Maintenance Due:</strong>
                    <span>${stats.pending}</span>
                </div>
                <div class="meta-item">
                    <strong>Critical:</strong>
                    <span>${stats.critical}</span>
                </div>
            </div>
            <h4 style="font-weight: 600; margin: 16px 0 8px 0;">Equipment List:</h4>
            ${MaintenanceApp.equipment.map(e => `
                <div style="padding: 12px; background: #f9fafb; border-radius: 6px; margin-bottom: 8px;">
                    <strong>${e.name}</strong> - ${e.type} (${e.status})
                </div>
            `).join('')}
        `;
    } else if (reportType === 'maintenance-summary') {
        const maint = MaintenanceApp.maintenance;
        reportHTML = `
            <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 12px;">Maintenance Summary</h3>
            <div class="equipment-meta" style="margin-bottom: 20px;">
                <div class="meta-item">
                    <strong>Total Records:</strong>
                    <span>${maint.length}</span>
                </div>
                <div class="meta-item">
                    <strong>Completed:</strong>
                    <span>${maint.filter(m => m.status === 'Completed').length}</span>
                </div>
                <div class="meta-item">
                    <strong>Scheduled:</strong>
                    <span>${maint.filter(m => m.status === 'Scheduled').length}</span>
                </div>
            </div>
            <h4 style="font-weight: 600; margin: 16px 0 8px 0;">By Type:</h4>
            ${['Preventive', 'Corrective', 'Inspection', 'Calibration', 'Replacement', 'Repair'].map(type => {
                const count = maint.filter(m => m.type === type).length;
                return count > 0 ? `<p style="padding: 8px; margin-bottom: 4px;">${type}: <strong>${count}</strong></p>` : '';
            }).join('')}
        `;
    } else if (reportType === 'uptime-analysis') {
        reportHTML = `
            <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 12px;">Uptime Analysis</h3>
            <div class="equipment-meta" style="margin-bottom: 20px;">
                <div class="meta-item">
                    <strong>Fleet Uptime:</strong>
                    <span style="font-size: 1.3rem; font-weight: 700; color: #3b82f6;">${stats.uptime}%</span>
                </div>
                <div class="meta-item">
                    <strong>Operational Units:</strong>
                    <span>${stats.operational}/${stats.total}</span>
                </div>
                <div class="meta-item">
                    <strong>Downtime Units:</strong>
                    <span>${stats.total - stats.operational}</span>
                </div>
            </div>
        `;
    } else if (reportType === 'critical-equipment') {
        const critical = MaintenanceApp.equipment.filter(e => e.critical);
        reportHTML = `
            <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 12px;">Critical Equipment Report</h3>
            <p style="margin-bottom: 16px;">Total Critical Equipment: <strong>${critical.length}</strong></p>
            ${critical.length === 0 ? '<p style="color: #9ca3af;">No critical equipment registered.</p>' : 
              critical.map(e => `
                <div style="padding: 12px; background: #fee2e2; border-left: 3px solid #dc2626; border-radius: 6px; margin-bottom: 8px;">
                    <strong>${e.name}</strong> (${e.type})<br>
                    <span style="font-size: 0.9rem; color: #6b7280;">Status: ${e.status}</span>
                </div>
              `).join('')
            }
        `;
    } else if (reportType === 'schedule-forecast') {
        const upcoming = MaintenanceApp.getUpcomingMaintenance();
        reportHTML = `
            <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 12px;">30-Day Maintenance Forecast</h3>
            <p style="margin-bottom: 16px;">Scheduled Maintenance: <strong>${upcoming.length}</strong></p>
            ${upcoming.length === 0 ? '<p style="color: #9ca3af;">No maintenance scheduled for the next 30 days.</p>' :
              upcoming.map(item => `
                <div style="padding: 12px; background: #e0e7ff; border-left: 3px solid #3b82f6; border-radius: 6px; margin-bottom: 8px;">
                    <strong>${item.equipment.name}</strong> - ${item.daysUntil} days<br>
                    <span style="font-size: 0.9rem; color: #6b7280;">Due: ${item.nextDue.toLocaleDateString()}</span>
                </div>
              `).join('')
            }
        `;
    }
    
    preview.innerHTML = reportHTML;
}

function exportToCSV() {
    const headers = ['Equipment Name', 'Type', 'Location', 'Serial', 'Status', 'Maintenance Interval', 'Critical', 'Notes'];
    const rows = MaintenanceApp.equipment.map(e => [
        e.name,
        e.type,
        e.location,
        e.serial || 'N/A',
        e.status,
        e.maintenanceInterval,
        e.critical ? 'Yes' : 'No',
        e.notes || ''
    ]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `equipment-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// Initialize app on page load
document.addEventListener('DOMContentLoaded', () => {
    MaintenanceApp.init();
});