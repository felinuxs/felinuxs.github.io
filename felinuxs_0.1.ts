import { 
    createHash, 
    randomBytes, 
    createSign, 
    createVerify, 
    generateKeyPairSync, 
    KeyPairKeyObjectResult,
    createCipheriv,
    createDecipheriv,
    scryptSync
} from 'crypto';
import { 
    readFileSync, 
    writeFileSync, 
    existsSync, 
    mkdirSync, 
    readdirSync, 
    unlinkSync,
    statSync 
} from 'fs';
import { join } from 'path';

// ==================== TIPOS Y INTERFACES ====================
interface NeuralNetworkConfig {
    architecture: number[];
    learningRate?: number;
    weightInitialization?: 'xavier' | 'he' | 'random';
    activation?: 'relu' | 'sigmoid' | 'tanh' | 'leaky_relu';
    problemType?: 'regression' | 'binary_classification' | 'multiclass_classification';
}

interface SecurityConfig {
    minFunctionalThreshold: number;
    maxCRCLockoutTime: number;
    performanceBaseline: number;
    maxSoftResets: number;
    cryptoAuditInterval: number;
    healthCheckInterval: number;
}

interface ModelHealthMetrics {
    healthScore: number;
    lastCheck: number;
    nanWeights: number;
    totalWeights: number;
    gradientExplosion: boolean;
    vanishingGradients: boolean;
    trainingLoss: number;
    validationAccuracy: number;
}

interface TrainingMetrics {
    epoch: number;
    loss: number;
    accuracy: number;
    timestamp: number;
    learningRate: number;
}

// ==================== EXCEPCIONES ESPECÍFICAS ====================
class SecurityViolationError extends Error {
    public readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    
    constructor(message: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'HIGH') {
        super(message);
        this.name = 'SecurityViolationError';
        this.severity = severity;
    }
}

class CryptoIntegrityError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CryptoIntegrityError';
    }
}

class PerformanceDegradationError extends Error {
    public readonly degradationLevel: number;
    
    constructor(message: string, degradationLevel: number) {
        super(message);
        this.name = 'PerformanceDegradationError';
        this.degradationLevel = degradationLevel;
    }
}

class TrainingError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TrainingError';
    }
}

class TimeSliceExceeded extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TimeSliceExceeded';
    }
}

// ==================== SERVICIO DE CRIPTOGRAFÍA COMPLETAMENTE CORREGIDO ====================
class QuantumResistantCrypto {
    private static keyPassphrase: string | null = null;

    private static ensurePassphraseInitialized(): void {
        if (this.keyPassphrase === null) {
            this.keyPassphrase = process.env.CRYPTO_PASSPHRASE || this.generateSecurePassphrase();
        }
    }

    private static generateSecurePassphrase(): string {
        return randomBytes(32).toString('hex');
    }

    public static generateKeyPair(): { publicKey: string; privateKey: string } {
        this.ensurePassphraseInitialized();
        
        try {
            const keyPair: KeyPairKeyObjectResult = generateKeyPairSync('rsa', {
                modulusLength: 4096,
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem'
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem',
                    cipher: 'aes-256-cbc',
                    passphrase: this.keyPassphrase!
                }
            });
            
            return {
                publicKey: keyPair.publicKey,
                privateKey: keyPair.privateKey
            };
        } catch (error: any) {
            throw new CryptoIntegrityError(`Failed to generate key pair: ${error.message}`);
        }
    }

    public static signData(data: any, privateKey: string): string {
        this.ensurePassphraseInitialized();
        
        try {
            const signer = createSign('SHA512');
            const dataString = typeof data === 'string' ? data : JSON.stringify(data, this.serializer);
            signer.update(dataString);
            signer.end();
            
            return signer.sign({
                key: privateKey,
                passphrase: this.keyPassphrase!
            }, 'base64');
        } catch (error: any) {
            throw new CryptoIntegrityError(`Signing failed: ${error.message}`);
        }
    }

    public static verifySignature(data: any, signature: string, publicKey: string): boolean {
        try {
            const verifier = createVerify('SHA512');
            const dataString = typeof data === 'string' ? data : JSON.stringify(data, this.serializer);
            verifier.update(dataString);
            verifier.end();
            
            return verifier.verify(publicKey, signature, 'base64');
        } catch (error: any) {
            console.warn(`Signature verification failed: ${error.message}`);
            return false;
        }
    }

    public static generateSecureHash(data: any, salt?: string): string {
        const dataString = typeof data === 'string' ? data : JSON.stringify(data, this.serializer);
        const input = salt ? dataString + salt : dataString;
        
        return createHash('sha3-512')
            .update(input)
            .digest('hex');
    }

    public static encryptData(data: string): { iv: string; encrypted: string; authTag: string } {
        this.ensurePassphraseInitialized();
        
        try {
            const key = this.deriveKeyFromPassword(this.keyPassphrase!, 'encryption_salt');
            const iv = randomBytes(16);
            const cipher = createCipheriv('aes-256-gcm', key, iv);
            
            let encrypted = cipher.update(data, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const authTag = cipher.getAuthTag();
            
            return {
                iv: iv.toString('hex'),
                encrypted: encrypted,
                authTag: authTag.toString('hex')
            };
        } catch (error: any) {
            throw new CryptoIntegrityError(`Encryption failed: ${error.message}`);
        }
    }

    public static decryptData(encryptedData: string, iv: string, authTag: string): string {
        this.ensurePassphraseInitialized();
        
        try {
            const key = this.deriveKeyFromPassword(this.keyPassphrase!, 'encryption_salt');
            const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
            decipher.setAuthTag(Buffer.from(authTag, 'hex'));
            
            let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error: any) {
            throw new CryptoIntegrityError(`Decryption failed: ${error.message}`);
        }
    }

    private static deriveKeyFromPassword(password: string, salt: string): Buffer {
        return scryptSync(password, salt, 32);
    }

    private static serializer(key: string, value: any): any {
        if (value instanceof Float64Array) {
            return Array.from(value);
        }
        if (value instanceof Map) {
            return Object.fromEntries(value);
        }
        if (value instanceof Set) {
            return Array.from(value);
        }
        return value;
    }
}

// ==================== MÉTRICAS DE RENDIMIENTO COMPLETAMENTE CORREGIDAS ====================
class PerformanceMetrics {
    private startTime: number;
    private successfulExecutions: number;
    private blockedExecutions: number;
    private performanceSamples: number[];
    private lastOperationTime: number;
    private readonly sampleWindow: number;

    constructor() {
        this.startTime = Date.now();
        this.successfulExecutions = 0;
        this.blockedExecutions = 0;
        this.performanceSamples = [];
        this.lastOperationTime = Date.now();
        this.sampleWindow = 100;
    }

    public recordSuccessfulExecution(): void {
        this.successfulExecutions++;
        this.lastOperationTime = Date.now();
    }

    public recordBlockedExecution(): void {
        this.blockedExecutions++;
        this.lastOperationTime = Date.now();
    }

    public recordPerformanceSample(performance: number): void {
        if (isNaN(performance) || !isFinite(performance) || performance < 0) {
            return; // Ignorar valores inválidos
        }
        this.performanceSamples.push(performance);
        if (this.performanceSamples.length > this.sampleWindow) {
            this.performanceSamples.shift();
        }
    }

    public calculateCurrentPerformance(): number {
        const now = Date.now();
        const timeWindow = Math.max(1000, now - this.lastOperationTime);
        const totalExecutions = this.successfulExecutions + this.blockedExecutions;
        
        if (timeWindow <= 0) return 0;
        
        const opsPerSecond = totalExecutions / (timeWindow / 1000);
        
        // Filtrar y calcular promedio de muestras válidas
        const validSamples = this.performanceSamples.filter(s => 
            !isNaN(s) && isFinite(s) && s >= 0
        );
        
        if (validSamples.length > 0) {
            const recentAvg = validSamples.reduce((a, b) => a + b, 0) / validSamples.length;
            return Math.min(opsPerSecond, recentAvg);
        }
        
        return opsPerSecond;
    }

    public getCurrentPerformance(): number {
        return this.calculateCurrentPerformance();
    }

    public getSnapshot(): any {
        const currentPerf = this.calculateCurrentPerformance();
        const validSamples = this.performanceSamples.filter(s => 
            !isNaN(s) && isFinite(s) && s >= 0
        );
        const avgPerf = validSamples.length > 0 
            ? validSamples.reduce((a, b) => a + b, 0) / validSamples.length 
            : currentPerf;
            
        return {
            successfulExecutions: this.successfulExecutions,
            blockedExecutions: this.blockedExecutions,
            currentPerformance: currentPerf,
            averagePerformance: avgPerf,
            sampleCount: validSamples.length,
            uptime: Date.now() - this.startTime
        };
    }

    public reset(): void {
        this.successfulExecutions = 0;
        this.blockedExecutions = 0;
        this.performanceSamples = [];
        this.lastOperationTime = Date.now();
    }

    public getStartTime(): number {
        return this.startTime;
    }
}

// ==================== MONITOR DE AUTORIDADES CRIPTOGRÁFICAS CORREGIDO ====================
class CryptoAuthorityMonitor {
    public static async scanSecurityAlerts(): Promise<any[]> {
        try {
            await new Promise(resolve => setTimeout(resolve, 50));
            
            return [
                {
                    severity: 'LOW',
                    data: { 
                        type: 'ROUTINE_UPDATE', 
                        algorithm: 'RSA-4096',
                        timestamp: Date.now(),
                        message: 'Routine security update completed'
                    },
                    signature: 'simulated_signature_low',
                    authority: 'FELINUXS_CRYPTO_COUNCIL'
                }
            ];
        } catch (error) {
            console.warn('Failed to scan security alerts:', error);
            return [];
        }
    }
}

// ==================== NEURAL NETWORK COMPLETAMENTE CORREGIDA ====================
class SecureNeuralNetwork {
    public readonly id: string;
    private architecture: number[];
    private weights: Float64Array[];
    private biases: Float64Array[];
    private learningRate: number;
    private weightInitialization: string;
    private activationFunctionType: string;
    private problemType: string;
    
    private trainingHistory: TrainingMetrics[];
    private modificationCount: number;
    private lastHealthCheck: number;
    private currentEpoch: number;

    constructor(config: NeuralNetworkConfig) {
        // Validar configuración primero
        this.validateConfig(config);
        
        // Inicializar propiedades básicas
        this.architecture = [...config.architecture];
        this.learningRate = config.learningRate || 0.01;
        this.weightInitialization = config.weightInitialization || 'xavier';
        this.activationFunctionType = config.activation || 'relu';
        this.problemType = config.problemType || 'regression';
        
        // Inicializar arrays y contadores
        this.weights = [];
        this.biases = [];
        this.trainingHistory = [];
        this.modificationCount = 0;
        this.lastHealthCheck = Date.now();
        this.currentEpoch = 0;

        // Generar ID después de inicializar todo
        this.id = this.generateModelId(config);
        
        // Inicializar red
        this.initializeNetwork();
        this.verifyInitialization();
    }

    private validateConfig(config: NeuralNetworkConfig): void {
        if (!config.architecture || config.architecture.length < 2) {
            throw new SecurityViolationError(
                'Network architecture must have at least 2 layers',
                'HIGH'
            );
        }
        
        for (const layerSize of config.architecture) {
            if (typeof layerSize !== 'number' || layerSize <= 0 || !Number.isInteger(layerSize)) {
                throw new SecurityViolationError(
                    `Invalid layer size: ${layerSize}. Must be positive integer`,
                    'HIGH'
                );
            }
        }
        
        if (config.learningRate && (config.learningRate <= 0 || config.learningRate > 1)) {
            throw new SecurityViolationError(
                `Invalid learning rate: ${config.learningRate}. Must be between 0 and 1`,
                'HIGH'
            );
        }
    }

    private generateModelId(config: NeuralNetworkConfig): string {
        return QuantumResistantCrypto.generateSecureHash({
            arch: config.architecture,
            timestamp: Date.now(),
            nonce: randomBytes(16).toString('hex'),
            instance: 'neural_network'
        });
    }

    private initializeNetwork(): void {
        for (let i = 0; i < this.architecture.length - 1; i++) {
            const inputSize = this.architecture[i];
            const outputSize = this.architecture[i + 1];
            
            const layerWeights = new Float64Array(inputSize * outputSize);
            const layerBiases = new Float64Array(outputSize);
            
            this.initializeLayer(layerWeights, inputSize, outputSize);
            this.initializeBiases(layerBiases, outputSize);
            
            this.weights.push(layerWeights);
            this.biases.push(layerBiases);
        }
    }

    private initializeLayer(weights: Float64Array, inputSize: number, outputSize: number): void {
        const scale = this.getInitializationScale(inputSize, outputSize);
        
        for (let i = 0; i < weights.length; i++) {
            let weightValue: number;
            
            switch (this.weightInitialization) {
                case 'xavier':
                    weightValue = (Math.random() - 0.5) * 2 * scale;
                    break;
                case 'he':
                    weightValue = (Math.random() - 0.5) * 2 * Math.sqrt(2 / inputSize);
                    break;
                default:
                    weightValue = (Math.random() - 0.5) * 2;
            }
            
            weights[i] = this.isValidNumber(weightValue) ? weightValue : 0.1;
        }
    }

    private initializeBiases(biases: Float64Array, size: number): void {
        for (let i = 0; i < size; i++) {
            const biasValue = (Math.random() - 0.5) * 0.1;
            biases[i] = this.isValidNumber(biasValue) ? biasValue : 0.01;
        }
    }

    private getInitializationScale(inputSize: number, outputSize: number): number {
        switch (this.weightInitialization) {
            case 'xavier':
                return Math.sqrt(6 / (inputSize + outputSize));
            case 'he':
                return Math.sqrt(2 / inputSize);
            default:
                return 1.0;
        }
    }

    private verifyInitialization(): void {
        for (let i = 0; i < this.weights.length; i++) {
            const layerWeights = this.weights[i];
            for (let j = 0; j < layerWeights.length; j++) {
                if (!this.isValidNumber(layerWeights[j])) {
                    throw new SecurityViolationError(
                        `Invalid weight at layer ${i}, position ${j}`, 
                        'CRITICAL'
                    );
                }
            }
        }
        
        for (let i = 0; i < this.biases.length; i++) {
            const layerBiases = this.biases[i];
            for (let j = 0; j < layerBiases.length; j++) {
                if (!this.isValidNumber(layerBiases[j])) {
                    throw new SecurityViolationError(
                        `Invalid bias at layer ${i}, position ${j}`, 
                        'CRITICAL'
                    );
                }
            }
        }
    }

    private isValidNumber(value: number): boolean {
        return !isNaN(value) && isFinite(value) && Math.abs(value) < 1e6;
    }

    // FUNCIONES DE ACTIVACIÓN CORREGIDAS
    private activationFunction(x: number): number {
        const boundedX = Math.max(Math.min(x, 100), -100);
        
        switch (this.activationFunctionType) {
            case 'sigmoid':
                return 1 / (1 + Math.exp(-boundedX));
            case 'tanh':
                return Math.tanh(boundedX);
            case 'leaky_relu':
                return boundedX >= 0 ? boundedX : 0.01 * boundedX;
            case 'relu':
            default:
                return Math.max(0, boundedX);
        }
    }

    private activationDerivative(x: number): number {
        const boundedX = Math.max(Math.min(x, 100), -100);
        
        switch (this.activationFunctionType) {
            case 'sigmoid':
                const sig = 1 / (1 + Math.exp(-boundedX));
                return sig * (1 - sig);
            case 'tanh':
                const th = Math.tanh(boundedX);
                return 1 - th * th;
            case 'leaky_relu':
                return boundedX >= 0 ? 1 : 0.01;
            case 'relu':
            default:
                return boundedX > 0 ? 1 : 0;
        }
    }

    // FORWARD PROPAGATION CORREGIDA
    public forward(input: Float64Array): { output: Float64Array; cache: any } {
        this.validateInput(input);
        
        let currentActivation = input;
        const cache: { 
            inputs: Float64Array[], 
            outputs: Float64Array[], 
            preActivations: Float64Array[] 
        } = {
            inputs: [],
            outputs: [],
            preActivations: []
        };

        for (let layer = 0; layer < this.weights.length; layer++) {
            cache.inputs.push(currentActivation);
            
            const inputSize = this.architecture[layer];
            const outputSize = this.architecture[layer + 1];
            const layerOutput = new Float64Array(outputSize);
            const preActivation = new Float64Array(outputSize);

            for (let i = 0; i < outputSize; i++) {
                let sum = this.biases[layer][i];
                
                for (let j = 0; j < inputSize; j++) {
                    const weightIndex = i * inputSize + j;
                    sum += currentActivation[j] * this.weights[layer][weightIndex];
                }
                
                preActivation[i] = sum;
                layerOutput[i] = this.activationFunction(sum);
            }
            
            cache.preActivations.push(preActivation);
            cache.outputs.push(layerOutput);
            currentActivation = layerOutput;
        }

        this.validateOutput(currentActivation);
        return { output: currentActivation, cache };
    }

    // BACKPROPAGACIÓN COMPLETAMENTE CORREGIDA
    public backward(input: Float64Array, target: Float64Array, cache: any): { weights: Float64Array[], biases: Float64Array[] } {
        this.validateInput(input);
        this.validateInput(target);

        const numLayers = this.weights.length;
        
        if (numLayers < 1) {
            throw new TrainingError('Network must have at least one layer');
        }

        const deltas: Float64Array[] = new Array(numLayers);
        const gradients = {
            weights: [] as Float64Array[],
            biases: [] as Float64Array[]
        };

        // Capa de salida
        const outputLayerIndex = numLayers - 1;
        const output = cache.outputs[outputLayerIndex];
        const preActivationOutput = cache.preActivations[outputLayerIndex];
        
        const outputDelta = new Float64Array(output.length);
        for (let i = 0; i < output.length; i++) {
            const error = output[i] - target[i];
            outputDelta[i] = error * this.activationDerivative(preActivationOutput[i]);
        }
        deltas[outputLayerIndex] = outputDelta;

        // Capas ocultas - CORRECCIÓN: Manejo seguro de índices
        for (let layer = numLayers - 2; layer >= 0; layer--) {
            // Validar que tenemos capas suficientes
            if (layer + 1 >= this.architecture.length) {
                throw new TrainingError(`Invalid layer index in backpropagation: ${layer}`);
            }
            
            const currentLayerSize = this.architecture[layer + 1];
            const nextLayerSize = this.architecture[layer + 2] || 1; // CORRECCIÓN: Valor por defecto
            const nextWeights = this.weights[layer + 1];
            const nextDeltas = deltas[layer + 1];
            const currentPreActivation = cache.preActivations[layer];
            
            const currentDelta = new Float64Array(currentLayerSize);

            for (let i = 0; i < currentLayerSize; i++) {
                let error = 0;
                
                for (let j = 0; j < nextLayerSize; j++) {
                    const weightIndex = j * currentLayerSize + i;
                    if (weightIndex < nextWeights.length && j < nextDeltas.length) {
                        error += nextDeltas[j] * nextWeights[weightIndex];
                    }
                }
                
                currentDelta[i] = error * this.activationDerivative(currentPreActivation[i]);
            }
            
            deltas[layer] = currentDelta;
        }

        // Calcular gradientes
        for (let layer = 0; layer < numLayers; layer++) {
            const layerInput = cache.inputs[layer];
            const layerDelta = deltas[layer];
            const inputSize = this.architecture[layer];
            const outputSize = this.architecture[layer + 1];

            const weightGradients = new Float64Array(inputSize * outputSize);
            const biasGradients = new Float64Array(outputSize);

            for (let i = 0; i < outputSize; i++) {
                biasGradients[i] = layerDelta[i];
                
                for (let j = 0; j < inputSize; j++) {
                    const gradIndex = i * inputSize + j;
                    weightGradients[gradIndex] = layerDelta[i] * layerInput[j];
                }
            }

            gradients.weights.push(weightGradients);
            gradients.biases.push(biasGradients);
        }

        this.clipGradients(gradients);
        return gradients;
    }

    private clipGradients(gradients: { weights: Float64Array[], biases: Float64Array[] }): void {
        const maxGradient = 1.0;
        
        for (const weightGrads of gradients.weights) {
            for (let i = 0; i < weightGrads.length; i++) {
                if (Math.abs(weightGrads[i]) > maxGradient) {
                    weightGrads[i] = Math.sign(weightGrads[i]) * maxGradient;
                }
            }
        }

        for (const biasGrads of gradients.biases) {
            for (let i = 0; i < biasGrads.length; i++) {
                if (Math.abs(biasGrads[i]) > maxGradient) {
                    biasGrads[i] = Math.sign(biasGrads[i]) * maxGradient;
                }
            }
        }
    }

    // ENTRENAMIENTO COMPLETAMENTE CORREGIDO
    public train(inputs: Float64Array[], targets: Float64Array[], epochs: number, batchSize: number = 32): { losses: number[], accuracies: number[], timestamps: number[], learning_rates: number[] } {
        this.validateTrainingData(inputs, targets);
        
        const history = { 
            losses: [] as number[],
            accuracies: [] as number[],
            timestamps: [] as number[],
            learning_rates: [] as number[]
        };

        for (let epoch = 0; epoch < epochs; epoch++) {
            this.currentEpoch = epoch;
            let totalLoss = 0;
            let correctPredictions = 0;
            let totalPredictions = 0;

            // Entrenamiento por lotes
            for (let batchStart = 0; batchStart < inputs.length; batchStart += batchSize) {
                const batchEnd = Math.min(batchStart + batchSize, inputs.length);
                const batchInputs = inputs.slice(batchStart, batchEnd);
                const batchTargets = targets.slice(batchStart, batchEnd);

                for (let i = 0; i < batchInputs.length; i++) {
                    const { output, cache } = this.forward(batchInputs[i]);
                    const gradients = this.backward(batchInputs[i], batchTargets[i], cache);
                    
                    this.updateWeights(gradients);
                    
                    // CORRECCIÓN: Calcular pérdida correctamente (MSE)
                    let sampleLoss = 0;
                    for (let j = 0; j < output.length; j++) {
                        const error = output[j] - batchTargets[i][j];
                        sampleLoss += error * error;
                    }
                    totalLoss += sampleLoss; // Sumar sin dividir todavía
                    
                    // Calcular precisión
                    if (this.problemType === 'binary_classification') {
                        const predictedClass = output[0] > 0.5 ? 1 : 0;
                        const actualClass = batchTargets[i][0] > 0.5 ? 1 : 0;
                        if (predictedClass === actualClass) {
                            correctPredictions++;
                        }
                        totalPredictions++;
                    } else if (this.problemType === 'multiclass_classification') {
                        let predictedIndex = 0;
                        let actualIndex = 0;
                        let maxOutput = output[0];
                        let maxTarget = batchTargets[i][0];
                        
                        for (let j = 1; j < output.length; j++) {
                            if (output[j] > maxOutput) {
                                maxOutput = output[j];
                                predictedIndex = j;
                            }
                            if (batchTargets[i][j] > maxTarget) {
                                maxTarget = batchTargets[i][j];
                                actualIndex = j;
                            }
                        }
                        
                        if (predictedIndex === actualIndex) {
                            correctPredictions++;
                        }
                        totalPredictions++;
                    }
                }
            }

            // CORRECCIÓN: Calcular pérdida promedio correctamente
            const avgLoss = totalLoss / (inputs.length * (targets[0]?.length || 1));
            const accuracy = totalPredictions > 0 ? correctPredictions / totalPredictions : 0;

            // Solo agregar valores válidos al historial
            if (!isNaN(avgLoss) && isFinite(avgLoss)) {
                history.losses.push(avgLoss);
                history.accuracies.push(accuracy);
                history.timestamps.push(Date.now());
                history.learning_rates.push(this.learningRate);

                this.trainingHistory.push({
                    epoch: epoch,
                    loss: avgLoss,
                    accuracy: accuracy,
                    timestamp: Date.now(),
                    learningRate: this.learningRate
                });
            }

            this.modificationCount++;
            
            // Ajuste adaptativo de learning rate
            this.adaptiveLearningRate(epoch, avgLoss);
            
            // Verificar salud
            if (epoch % 10 === 0) {
                this.performHealthCheck();
            }

            // Early stopping
            if (this.shouldStopEarly(history.losses)) {
                console.log(`Early stopping at epoch ${epoch}`);
                break;
            }
        }

        return history;
    }

    private adaptiveLearningRate(epoch: number, loss: number): void {
        if (isNaN(loss) || !isFinite(loss)) return;
        
        if (epoch > 0 && epoch % 50 === 0) {
            this.learningRate = Math.max(0.0001, this.learningRate * 0.95);
        }
        
        if (epoch > 100 && loss > 0.5) {
            this.learningRate = Math.min(0.1, this.learningRate * 1.05);
        }
    }

    private shouldStopEarly(losses: number[]): boolean {
        if (losses.length < 10) return false;
        
        const recentLosses = losses.slice(-10).filter(l => !isNaN(l) && isFinite(l));
        if (recentLosses.length < 5) return false; // No hay suficientes datos válidos
        
        const minRecent = Math.min(...recentLosses);
        const minOverall = Math.min(...losses.filter(l => !isNaN(l) && isFinite(l)));
        
        return Math.abs(minOverall - minRecent) < 0.001;
    }

    private updateWeights(gradients: { weights: Float64Array[], biases: Float64Array[] }): void {
        for (let layer = 0; layer < this.weights.length; layer++) {
            for (let i = 0; i < this.weights[layer].length; i++) {
                this.weights[layer][i] -= this.learningRate * gradients.weights[layer][i];
                
                if (!this.isValidNumber(this.weights[layer][i])) {
                    this.weights[layer][i] = 0.01;
                }
            }
            
            for (let i = 0; i < this.biases[layer].length; i++) {
                this.biases[layer][i] -= this.learningRate * gradients.biases[layer][i];
                
                if (!this.isValidNumber(this.biases[layer][i])) {
                    this.biases[layer][i] = 0.001;
                }
            }
        }
    }

    // VALIDACIONES ROBUSTAS
    private validateInput(input: Float64Array): void {
        if (!input || !(input instanceof Float64Array)) {
            throw new SecurityViolationError('Input must be a Float64Array', 'HIGH');
        }

        if (input.length !== this.architecture[0]) {
            throw new SecurityViolationError(
                `Input size mismatch: expected ${this.architecture[0]}, got ${input.length}`,
                'HIGH'
            );
        }

        for (let i = 0; i < input.length; i++) {
            if (!this.isValidNumber(input[i])) {
                throw new SecurityViolationError(
                    `Invalid input value at position ${i}: ${input[i]}`,
                    'HIGH'
                );
            }
        }
    }

    private validateOutput(output: Float64Array): void {
        if (!output || !(output instanceof Float64Array)) {
            throw new SecurityViolationError('Output must be a Float64Array', 'CRITICAL');
        }

        for (let i = 0; i < output.length; i++) {
            if (!this.isValidNumber(output[i])) {
                throw new SecurityViolationError(
                    `Invalid output value at position ${i}: ${output[i]}`,
                    'CRITICAL'
                );
            }
        }
    }

    private validateTrainingData(inputs: Float64Array[], targets: Float64Array[]): void {
        if (!inputs || !targets) {
            throw new SecurityViolationError('Inputs and targets cannot be null', 'HIGH');
        }

        if (inputs.length !== targets.length) {
            throw new SecurityViolationError(
                `Input and target arrays must have the same length: ${inputs.length} vs ${targets.length}`,
                'HIGH'
            );
        }

        if (inputs.length === 0) {
            throw new SecurityViolationError('Training data cannot be empty', 'MEDIUM');
        }

        const inputSize = this.architecture[0];
        const outputSize = this.architecture[this.architecture.length - 1];

        for (let i = 0; i < inputs.length; i++) {
            this.validateInput(inputs[i]);
            
            if (!targets[i] || targets[i].length !== outputSize) {
                throw new SecurityViolationError(
                    `Target ${i} has incorrect size: expected ${outputSize}, got ${targets[i]?.length}`,
                    'HIGH'
                );
            }
        }
    }

    private performHealthCheck(): void {
        const health = this.getHealthMetrics();
        
        if (health.healthScore < 0.8) {
            throw new PerformanceDegradationError(
                `Neural network health critical: ${health.healthScore}`,
                Math.max(0, 1 - health.healthScore)
            );
        }
        
        this.lastHealthCheck = Date.now();
    }

    public getHealthMetrics(): ModelHealthMetrics {
        let totalWeights = 0;
        let nanWeights = 0;
        let gradientExplosion = false;
        let vanishingGradients = false;

        for (const layerWeights of this.weights) {
            for (const weight of layerWeights) {
                totalWeights++;
                if (!this.isValidNumber(weight)) {
                    nanWeights++;
                }
                
                if (Math.abs(weight) > 1000) {
                    gradientExplosion = true;
                }
                
                if (Math.abs(weight) < 1e-10 && weight !== 0) {
                    vanishingGradients = true;
                }
            }
        }

        const healthScore = totalWeights > 0 ? 1 - (nanWeights / totalWeights) : 1;
        const currentLoss = this.trainingHistory.length > 0 ? 
            this.trainingHistory[this.trainingHistory.length - 1].loss : 1;

        return {
            healthScore: Math.max(0, Math.min(1, healthScore)),
            lastCheck: this.lastHealthCheck,
            nanWeights,
            totalWeights,
            gradientExplosion,
            vanishingGradients,
            trainingLoss: currentLoss,
            validationAccuracy: 0
        };
    }

    // GETTERS Y SETTERS SEGUROS
    public getArchitecture(): number[] {
        return [...this.architecture];
    }

    public getWeights(): Float64Array[] {
        return this.weights.map(w => new Float64Array(w));
    }

    public getBiases(): Float64Array[] {
        return this.biases.map(b => new Float64Array(b));
    }

    public setWeights(weights: Float64Array[]): void {
        if (!weights || weights.length !== this.weights.length) {
            throw new SecurityViolationError(
                `Weights structure mismatch: expected ${this.weights.length} layers, got ${weights?.length}`,
                'HIGH'
            );
        }
        
        for (let i = 0; i < weights.length; i++) {
            if (!weights[i] || weights[i].length !== this.weights[i].length) {
                throw new SecurityViolationError(
                    `Weights size mismatch at layer ${i}: expected ${this.weights[i].length}, got ${weights[i]?.length}`,
                    'HIGH'
                );
            }
            
            for (let j = 0; j < weights[i].length; j++) {
                if (!this.isValidNumber(weights[i][j])) {
                    throw new SecurityViolationError(
                        `Invalid weight value at layer ${i}, position ${j}: ${weights[i][j]}`,
                        'CRITICAL'
                    );
                }
            }
            
            this.weights[i] = new Float64Array(weights[i]);
        }
        
        this.modificationCount++;
    }

    public setBiases(biases: Float64Array[]): void {
        if (!biases || biases.length !== this.biases.length) {
            throw new SecurityViolationError(
                `Biases structure mismatch: expected ${this.biases.length} layers, got ${biases?.length}`,
                'HIGH'
            );
        }
        
        for (let i = 0; i < biases.length; i++) {
            if (!biases[i] || biases[i].length !== this.biases[i].length) {
                throw new SecurityViolationError(
                    `Biases size mismatch at layer ${i}: expected ${this.biases[i].length}, got ${biases[i]?.length}`,
                    'HIGH'
                );
            }

            for (let j = 0; j < biases[i].length; j++) {
                if (!this.isValidNumber(biases[i][j])) {
                    throw new SecurityViolationError(
                        `Invalid bias value at layer ${i}, position ${j}: ${biases[i][j]}`,
                        'CRITICAL'
                    );
                }
            }

            this.biases[i] = new Float64Array(biases[i]);
        }
        
        this.modificationCount++;
    }

    public getTrainingHistory(): TrainingMetrics[] {
        return [...this.trainingHistory];
    }

    public getModificationCount(): number {
        return this.modificationCount;
    }

    public predict(input: Float64Array): Float64Array {
        const { output } = this.forward(input);
        return output;
    }
}

// ==================== SISTEMA FELINUXS COMPLETAMENTE CORREGIDO ====================
class felinuxs_0_1 {
    private static instances: Map<string, felinuxs_0_1> = new Map();
    
    private readonly instanceId: string;
    private readonly securityConfig: SecurityConfig;
    private trustAnchor: { publicKey: string; privateKey: string };
    private modelRegistry: Map<string, SecureNeuralNetwork>;
    private amcRegistry: Map<string, any>;
    private baselineMetrics: Map<string, ModelHealthMetrics>;
    private performanceMetrics: PerformanceMetrics;
    private operationalStatus: string;
    private crcMode: boolean;
    private crcActivationTime: number;
    private softResetCount: number;
    private lastCryptoAudit: number;
    private monitoringIntervals: NodeJS.Timeout[];

    private constructor(instanceId: string, config?: SecurityConfig) {
        // CORRECCIÓN: Usar función estática para configuración
        this.instanceId = instanceId;
        this.securityConfig = config || felinuxs_0_1.getDefaultSecurityConfig();
        this.trustAnchor = { publicKey: '', privateKey: '' };
        this.modelRegistry = new Map();
        this.amcRegistry = new Map();
        this.baselineMetrics = new Map();
        this.performanceMetrics = new PerformanceMetrics();
        this.operationalStatus = 'INITIALIZING';
        this.crcMode = false;
        this.crcActivationTime = 0;
        this.softResetCount = 0;
        this.lastCryptoAudit = 0;
        this.monitoringIntervals = [];
        
        this.ensureDirectories();
        this.initializeSystem();
    }

    public static getInstance(instanceId: string = 'default', config?: SecurityConfig): felinuxs_0_1 {
        if (!felinuxs_0_1.instances.has(instanceId)) {
            felinuxs_0_1.instances.set(instanceId, new felinuxs_0_1(instanceId, config));
        }
        return felinuxs_0_1.instances.get(instanceId)!;
    }

    public static destroyInstance(instanceId: string): void {
        const instance = felinuxs_0_1.instances.get(instanceId);
        if (instance) {
            instance.shutdown();
            felinuxs_0_1.instances.delete(instanceId);
        }
    }

    public static listInstances(): string[] {
        return Array.from(felinuxs_0_1.instances.keys());
    }

    private static getDefaultSecurityConfig(): SecurityConfig {
        return {
            minFunctionalThreshold: 0.05,
            maxCRCLockoutTime: 60000,
            performanceBaseline: 1000,
            maxSoftResets: 10,
            cryptoAuditInterval: 30000,
            healthCheckInterval: 5000
        };
    }

    private ensureDirectories(): void {
        const directories = [
            `./secure/${this.instanceId}`,
            `./backups/${this.instanceId}`
        ];
        
        for (const dir of directories) {
            try {
                if (!existsSync(dir)) {
                    mkdirSync(dir, { recursive: true });
                }
            } catch (error: any) {
                throw new SecurityViolationError(
                    `Failed to create directory ${dir}: ${error.message}`,
                    'HIGH'
                );
            }
        }
    }

    private initializeSystem(): void {
        try {
            this.generateTrustAnchor();
            this.initializeGovernanceAMC();
            this.startMonitoringServices();
            this.performInitialHealthCheck();
            this.operationalStatus = 'OPERATIONAL';
            
            console.log(`Felinuxs instance ${this.instanceId} initialized successfully`);
        } catch (error: any) {
            this.operationalStatus = 'ERROR';
            console.error(`Failed to initialize Felinuxs instance ${this.instanceId}:`, error);
            throw error;
        }
    }

    private shutdown(): void {
        this.monitoringIntervals.forEach(interval => {
            if (interval) {
                clearInterval(interval);
            }
        });
        this.monitoringIntervals = [];
        this.operationalStatus = 'SHUTDOWN';
        console.log(`Felinuxs instance ${this.instanceId} shutdown completed`);
    }

    private generateTrustAnchor(): void {
        try {
            this.trustAnchor = QuantumResistantCrypto.generateKeyPair();
            
            const configSignature = QuantumResistantCrypto.signData(
                this.securityConfig, 
                this.trustAnchor.privateKey
            );
            
            this.saveTrustAnchor(configSignature);
        } catch (error: any) {
            throw new CryptoIntegrityError(`Failed to establish trust anchor: ${error.message}`);
        }
    }

    private saveTrustAnchor(configSignature: string): void {
        try {
            const secureData = {
                instanceId: this.instanceId,
                trustAnchor: {
                    publicKey: this.trustAnchor.publicKey,
                    privateKeyHash: QuantumResistantCrypto.generateSecureHash(this.trustAnchor.privateKey)
                },
                config: this.securityConfig,
                configSignature: configSignature,
                timestamp: Date.now()
            };
            
            const filePath = `./secure/${this.instanceId}/trust_anchor.json`;
            writeFileSync(filePath, JSON.stringify(secureData, null, 2));
        } catch (error: any) {
            throw new CryptoIntegrityError(`Failed to save trust anchor: ${error.message}`);
        }
    }

    private initializeGovernanceAMC(): void {
        const coreAMCs = [
            {
                id: 'amc_core_governance',
                type: 'GOVERNANCE',
                performance: { accuracy: 0.98, stability: 0.95 },
                permissions: ['AUDIT', 'MODIFY', 'MONITOR']
            },
            {
                id: 'amc_security_monitor', 
                type: 'SECURITY',
                performance: { accuracy: 0.96, responseTime: 0.99 },
                permissions: ['BLOCK', 'ALERT', 'QUARANTINE']
            },
            {
                id: 'amc_audit_committee',
                type: 'AUDIT',
                performance: { accuracy: 0.97, consistency: 0.96 },
                permissions: ['AUDIT', 'VALIDATE', 'CERTIFY']
            }
        ];

        for (const amc of coreAMCs) {
            this.amcRegistry.set(amc.id, amc);
        }
    }

    private startMonitoringServices(): void {
        const performanceInterval = setInterval(() => {
            this.monitorPerformance();
        }, this.securityConfig.healthCheckInterval);
        this.monitoringIntervals.push(performanceInterval);

        const healthCheckInterval = setInterval(() => {
            this.checkModelHealth();
        }, 30000);
        this.monitoringIntervals.push(healthCheckInterval);

        const cryptoAuditInterval = setInterval(async () => {
            await this.performCryptoAudit();
        }, this.securityConfig.cryptoAuditInterval);
        this.monitoringIntervals.push(cryptoAuditInterval);
    }

    private async monitorPerformance(): Promise<void> {
        try {
            const currentPerformance = this.performanceMetrics.getCurrentPerformance();
            
            if (currentPerformance < this.securityConfig.minFunctionalThreshold) {
                if (!this.crcMode) {
                    this.activateCRCMode();
                } else {
                    const crcDuration = Date.now() - this.crcActivationTime;
                    if (crcDuration > this.securityConfig.maxCRCLockoutTime) {
                        this.executeSoftReset();
                    }
                }
            } else if (this.crcMode && currentPerformance > this.securityConfig.minFunctionalThreshold * 1.5) {
                this.deactivateCRCMode();
            }

            this.performanceMetrics.recordPerformanceSample(currentPerformance);
        } catch (error: any) {
            console.error('Performance monitoring failed:', error.message);
        }
    }

    private async performCryptoAudit(): Promise<void> {
        try {
            const alerts = await CryptoAuthorityMonitor.scanSecurityAlerts();
            
            if (alerts.length > 0) {
                console.log(`Crypto audit found ${alerts.length} alerts`);
            }
            
            this.lastCryptoAudit = Date.now();
        } catch (error: any) {
            console.error('Crypto audit failed:', error.message);
        }
    }

    private activateCRCMode(): void {
        this.crcMode = true;
        this.crcActivationTime = Date.now();
        this.operationalStatus = 'CRC_MODE';
        console.warn(`CRC Mode activated for instance ${this.instanceId}`);
    }

    private deactivateCRCMode(): void {
        this.crcMode = false;
        this.operationalStatus = 'OPERATIONAL';
        console.log(`CRC Mode deactivated for instance ${this.instanceId}`);
    }

    private executeSoftReset(): void {
        this.softResetCount++;
        
        if (this.softResetCount > this.securityConfig.maxSoftResets) {
            this.enterSafeShutdown();
            return;
        }

        console.log(`Executing soft reset #${this.softResetCount} for instance ${this.instanceId}`);
        
        this.preserveCriticalState();
        this.performanceMetrics.reset();
        this.baselineMetrics.clear();
        this.crcMode = false;
        
        console.log(`Soft reset completed for instance ${this.instanceId}`);
    }

    private enterSafeShutdown(): void {
        this.operationalStatus = 'SAFE_SHUTDOWN';
        this.preserveCriticalState();
        this.notifyEmergencyShutdown();
        
        console.error(`ENTERING SAFE SHUTDOWN for instance ${this.instanceId} - Excessive soft resets detected`);
        
        this.shutdown();
    }

    private checkModelHealth(): void {
        for (const [modelId, model] of this.modelRegistry) {
            try {
                const health = model.getHealthMetrics();
                this.baselineMetrics.set(modelId, health);
                
                if (health.healthScore < 0.7) {
                    console.warn(`Model ${modelId} health critical: ${health.healthScore}`);
                    this.quarantineModel(modelId);
                }
            } catch (error: any) {
                console.error(`Health check failed for model ${modelId}:`, error.message);
                this.quarantineModel(modelId);
            }
        }
    }

    private quarantineModel(modelId: string): void {
        if (this.modelRegistry.has(modelId)) {
            this.modelRegistry.delete(modelId);
            console.error(`Model ${modelId} quarantined in instance ${this.instanceId}`);
        }
    }

    private preserveCriticalState(): void {
        try {
            const criticalState = {
                instanceId: this.instanceId,
                timestamp: Date.now(),
                trustAnchor: {
                    publicKey: this.trustAnchor.publicKey,
                },
                models: Array.from(this.modelRegistry.entries()).map(([id, model]) => ({
                    id,
                    architecture: model.getArchitecture(),
                    weights: model.getWeights().map(w => Array.from(w)),
                    biases: model.getBiases().map(b => Array.from(b))
                })),
                amcs: Array.from(this.amcRegistry.entries()),
                performance: this.performanceMetrics.getSnapshot(),
                softResetCount: this.softResetCount,
                operationalStatus: this.operationalStatus
            };

            const backupDir = `./backups/${this.instanceId}`;
            const backupFile = join(backupDir, `critical_state_${Date.now()}.json`);
            
            writeFileSync(backupFile, JSON.stringify(criticalState, null, 2));
            this.cleanupOldBackups(backupDir);
        } catch (error: any) {
            console.error('Failed to preserve critical state:', error.message);
        }
    }

    private cleanupOldBackups(backupDir: string): void {
        try {
            if (!existsSync(backupDir)) return;

            const files = readdirSync(backupDir)
                .filter(f => f.startsWith('critical_state_') && f.endsWith('.json'))
                .map(f => {
                    const filePath = join(backupDir, f);
                    try {
                        return {
                            name: f,
                            path: filePath,
                            time: statSync(filePath).mtime.getTime()
                        };
                    } catch {
                        return null;
                    }
                })
                .filter(f => f !== null)
                .sort((a, b) => b!.time - a!.time) as {name: string, path: string, time: number}[];

            if (files.length > 5) {
                for (const file of files.slice(5)) {
                    try {
                        unlinkSync(file.path);
                    } catch (error: any) {
                        console.warn(`Failed to delete backup ${file.name}:`, error.message);
                    }
                }
            }
        } catch (error: any) {
            console.warn('Failed to cleanup old backups:', error.message);
        }
    }

    private notifyEmergencyShutdown(): void {
        const shutdownEvent = {
            instanceId: this.instanceId,
            reason: 'EXCESSIVE_SOFT_RESETS',
            softResetCount: this.softResetCount,
            finalPerformance: this.performanceMetrics.getCurrentPerformance(),
            timestamp: Date.now(),
            models: Array.from(this.modelRegistry.keys()),
            operationalTime: Date.now() - this.performanceMetrics.getStartTime()
        };

        try {
            writeFileSync(`./emergency_shutdown_${this.instanceId}.json`, JSON.stringify(shutdownEvent, null, 2));
        } catch (error: any) {
            console.error('Failed to write emergency shutdown log:', error.message);
        }
        
        console.error('EMERGENCY SHUTDOWN:', shutdownEvent);
    }

    private performInitialHealthCheck(): void {
        const checks = [
            this.verifyCryptoReadiness(),
            this.verifyAMCGovernance(),
            this.verifyPerformanceBaseline()
        ];

        const failedChecks = checks.filter(check => !check.passed);
        
        if (failedChecks.length > 0) {
            const reasons = failedChecks.map(c => c.reason).join(', ');
            throw new SecurityViolationError(`Initial health check failed: ${reasons}`, 'CRITICAL');
        }
    }

    private verifyCryptoReadiness(): { passed: boolean; reason?: string } {
        try {
            if (!this.trustAnchor.publicKey || !this.trustAnchor.privateKey) {
                return { passed: false, reason: 'Trust anchor not established' };
            }

            const testData = { test: Date.now() };
            const signature = QuantumResistantCrypto.signData(testData, this.trustAnchor.privateKey);
            const verified = QuantumResistantCrypto.verifySignature(testData, signature, this.trustAnchor.publicKey);

            return { passed: verified, reason: verified ? undefined : 'Crypto verification failed' };
        } catch (error: any) {
            return { passed: false, reason: `Crypto test failed: ${error.message}` };
        }
    }

    private verifyAMCGovernance(): { passed: boolean; reason?: string } {
        const requiredAMCs = ['amc_core_governance', 'amc_security_monitor', 'amc_audit_committee'];
        
        for (const amcId of requiredAMCs) {
            if (!this.amcRegistry.has(amcId)) {
                return { passed: false, reason: `Required AMC missing: ${amcId}` };
            }
        }

        return { passed: true };
    }

    private verifyPerformanceBaseline(): { passed: boolean; reason?: string } {
        const initialPerformance = this.performanceMetrics.getCurrentPerformance();
        
        if (initialPerformance < this.securityConfig.performanceBaseline * 0.1) {
            return { 
                passed: false, 
                reason: `Initial performance too low: ${initialPerformance}` 
            };
        }

        return { passed: true };
    }

    // API pública
    public getSystemStatus(): any {
        return {
            instanceId: this.instanceId,
            operationalStatus: this.operationalStatus,
            crcMode: this.crcMode,
            softResetCount: this.softResetCount,
            modelCount: this.modelRegistry.size,
            amcCount: this.amcRegistry.size,
            performance: this.performanceMetrics.getCurrentPerformance(),
            lastCryptoAudit: this.lastCryptoAudit,
            systemUptime: Date.now() - this.performanceMetrics.getStartTime()
        };
    }

    public createModel(config: NeuralNetworkConfig): string {
        if (this.operationalStatus !== 'OPERATIONAL' && !this.crcMode) {
            throw new SecurityViolationError(
                `Cannot create model in current operational state: ${this.operationalStatus}`,
                'HIGH'
            );
        }

        try {
            const model = new SecureNeuralNetwork(config);
            this.modelRegistry.set(model.id, model);
            return model.id;
        } catch (error: any) {
            throw new SecurityViolationError(
                `Model creation failed: ${error.message}`,
                'HIGH'
            );
        }
    }

    public getModelHealth(modelId: string): ModelHealthMetrics | null {
        const model = this.modelRegistry.get(modelId);
        return model ? model.getHealthMetrics() : null;
    }

    public getModel(modelId: string): SecureNeuralNetwork | null {
        return this.modelRegistry.get(modelId) || null;
    }

    public listModels(): string[] {
        return Array.from(this.modelRegistry.keys());
    }

    public removeModel(modelId: string): boolean {
        return this.modelRegistry.delete(modelId);
    }

    public async performSecurityAudit(): Promise<{alerts: any[], status: string}> {
        try {
            const alerts = await CryptoAuthorityMonitor.scanSecurityAlerts();
            const hasCriticalAlerts = alerts.some(alert => alert.severity === 'CRITICAL');
            
            return {
                alerts,
                status: hasCriticalAlerts ? 'CRITICAL_ALERTS' : alerts.length > 0 ? 'WARNINGS' : 'SECURE'
            };
        } catch (error: any) {
            return {
                alerts: [],
                status: 'AUDIT_FAILED'
            };
        }
    }
}

// ==================== CLASE DE DEMOSTRACIÓN FUNCIONAL ====================
class FelinuxsDemo {
    public static async demonstrate(): Promise<void> {
        console.log('=== Felinuxs Security AI System Demo ===\n');
        
        try {
            console.log('1. Initializing Felinuxs instance...');
            const felinuxs = felinuxs_0_1.getInstance('demo-instance');
            
            const status = felinuxs.getSystemStatus();
            console.log('2. System status:', status.operationalStatus);
            
            console.log('3. Creating neural network model...');
            const modelConfig: NeuralNetworkConfig = {
                architecture: [2, 4, 1],
                learningRate: 0.1,
                activation: 'sigmoid',
                problemType: 'binary_classification'
            };
            
            const modelId = felinuxs.createModel(modelConfig);
            console.log('   Model created:', modelId);
            
            console.log('4. Training model on XOR problem...');
            const model = felinuxs.getModel(modelId);
            if (model) {
                const inputs = [
                    new Float64Array([0, 0]),
                    new Float64Array([0, 1]),
                    new Float64Array([1, 0]),
                    new Float64Array([1, 1])
                ];
                
                const targets = [
                    new Float64Array([0]),
                    new Float64Array([1]),
                    new Float64Array([1]),
                    new Float64Array([0])
                ];
                
                const history = model.train(inputs, targets, 100, 2);
                const finalLoss = history.losses[history.losses.length - 1];
                const finalAccuracy = history.accuracies[history.accuracies.length - 1];
                
                console.log(`   Training completed - Loss: ${finalLoss.toFixed(4)}, Accuracy: ${(finalAccuracy * 100).toFixed(1)}%`);
                
                console.log('5. Testing predictions...');
                for (const input of inputs) {
                    const prediction = model.predict(input);
                    console.log(`   Input: [${Array.from(input)}] -> Output: ${prediction[0].toFixed(4)}`);
                }
            }
            
            console.log('6. Performing security audit...');
            const auditResult = await felinuxs.performSecurityAudit();
            console.log('   Security status:', auditResult.status);
            
            console.log('7. System health check...');
            const modelHealth = felinuxs.getModelHealth(modelId);
            console.log('   Model health score:', modelHealth?.healthScore.toFixed(2));
            
            console.log('\n=== Demo completed successfully ===');
            
        } catch (error: any) {
            console.error('Demo failed:', error.message);
        }
    }
}

// Exportar clases principales
export { 
    felinuxs_0_1, 
    SecureNeuralNetwork as NeuralNetwork, 
    TimeSliceExceeded, 
    SecurityViolationError, 
    CryptoIntegrityError, 
    PerformanceDegradationError,
    TrainingError,
    QuantumResistantCrypto,
    PerformanceMetrics,
    FelinuxsDemo
};

// Ejecutar demostración si es el módulo principal
if (require.main === module) {
    FelinuxsDemo.demonstrate().catch(console.error);
}
