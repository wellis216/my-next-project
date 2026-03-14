export interface PowerData {
  timestamp: string;
  voltage: number;
  inputVoltage: number; // Added for comparison
  current: number;
  frequency: number;
  powerFactor: number;
  power: number;
  inputPower: number; // Added for comparison
  stationId: string;
  status: 'normal' | 'abnormal';
}

export interface Anomaly {
  id: string;
  timestamp: string;
  stationId: string;
  type: 'Voltage' | 'Current' | 'Frequency' | 'PowerFactor';
  value: number;
  threshold: number;
  message: string;
}

export const STATIONS = ['Station A', 'Station B', 'Station C', 'Station D'];

// Station-specific anomaly weights to make the pie chart more interesting
const STATION_ANOMALY_WEIGHTS: Record<string, number> = {
  'Station A': 0.05, // Very stable
  'Station B': 0.15,
  'Station C': 0.40, // Very unstable
  'Station D': 0.10,
};

export const THRESHOLDS = {
  voltage: { min: 100, max: 120, nominal: 110 },
  current: { max: 60 },
  frequency: { min: 59, max: 61, nominal: 60 },
  powerFactor: { min: 0.8 },
};

export function generateMockData(count: number = 20): PowerData[] {
  const data: PowerData[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const time = new Date(now.getTime() - (count - i) * 5000);
    const stationId = STATIONS[Math.floor(Math.random() * STATIONS.length)];
    const weight = STATION_ANOMALY_WEIGHTS[stationId];
    
    // Simulate periods of stability and volatility based on time
    // Toggle state every 30 seconds
    const totalSeconds = time.getMinutes() * 60 + time.getSeconds();
    const isVolatilePeriod = (Math.floor(totalSeconds / 30) % 2 === 0); 
    
    const volatilityMultiplier = isVolatilePeriod ? 3.0 : 0.4;
    
    // Base values with noise scaled by volatility
    const isTriggeringAnomaly = Math.random() < (weight * (isVolatilePeriod ? 2 : 0.5));
    
    let voltage = 110 + (Math.random() - 0.5) * (10 * volatilityMultiplier);
    let current = 35 + (Math.random() - 0.5) * (20 * volatilityMultiplier);
    
    if (isTriggeringAnomaly) {
      const type = Math.random();
      if (type < 0.5) voltage = 125 + Math.random() * 15;
      else current = 70 + Math.random() * 25;
    }

    const frequency = 60 + (Math.random() - 0.5) * (1.5 * volatilityMultiplier);
    const powerFactor = 0.9 + (Math.random() - 0.5) * (0.15 * volatilityMultiplier);
    
    // Input is the reference grid (more stable but still has some noise)
    const inputVoltage = 112 + (Math.random() - 0.5) * (2 * volatilityMultiplier);
    // Input power is slightly higher than output due to efficiency
    const power = Number((voltage * current * Math.max(0.1, Math.min(1, powerFactor)) / 1000).toFixed(2));
    const inputPower = Number((power * 1.15 + (Math.random() * 2)).toFixed(2)); 

    const isAbnormal = 
      voltage < THRESHOLDS.voltage.min || voltage > THRESHOLDS.voltage.max ||
      current > THRESHOLDS.current.max ||
      frequency < THRESHOLDS.frequency.min || frequency > THRESHOLDS.frequency.max ||
      powerFactor < THRESHOLDS.powerFactor.min;

    data.push({
      timestamp: time.toISOString(),
      voltage: Number(voltage.toFixed(2)),
      inputVoltage: Number(inputVoltage.toFixed(2)),
      current: Number(current.toFixed(2)),
      frequency: Number(frequency.toFixed(2)),
      powerFactor: Number(powerFactor.toFixed(2)),
      power,
      inputPower,
      stationId,
      status: isAbnormal ? 'abnormal' : 'normal',
    });
  }
  return data;
}

export function generateAnomalies(data: PowerData[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  data.forEach((d, idx) => {
    if (d.voltage > THRESHOLDS.voltage.max) {
      anomalies.push({
        id: `v-high-${d.timestamp}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: d.timestamp,
        stationId: d.stationId,
        type: 'Voltage',
        value: d.voltage,
        threshold: THRESHOLDS.voltage.max,
        message: `電壓過高: ${d.voltage}V (閾值: ${THRESHOLDS.voltage.max}V)`,
      });
    } else if (d.voltage < THRESHOLDS.voltage.min) {
      anomalies.push({
        id: `v-low-${d.timestamp}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: d.timestamp,
        stationId: d.stationId,
        type: 'Voltage',
        value: d.voltage,
        threshold: THRESHOLDS.voltage.min,
        message: `電壓過低: ${d.voltage}V (閾值: ${THRESHOLDS.voltage.min}V)`,
      });
    }
    
    if (d.current > THRESHOLDS.current.max) {
      anomalies.push({
        id: `c-high-${d.timestamp}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: d.timestamp,
        stationId: d.stationId,
        type: 'Current',
        value: d.current,
        threshold: THRESHOLDS.current.max,
        message: `電流過載: ${d.current}A (閾值: ${THRESHOLDS.current.max}A)`,
      });
    }
  });
  return anomalies;
}
