class PCMProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const buffer = new Float32Array(input[0]);
      this.port.postMessage(buffer);
    }
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
