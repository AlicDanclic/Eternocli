const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

/**
 * 获取媒体文件详细信息
 * @param {string} path 媒体文件路径
 * @returns {Promise<Object>} 媒体文件详细信息
 */
function getMediaDetails(path) {
  return new Promise((resolve, reject) => {
    // 检查文件是否存在
    if (!fs.existsSync(path)) {
      return reject(new Error('文件不存在'));
    }

    ffmpeg.ffprobe(path, (err, metadata) => {
      if (err) {
        return reject(new Error('无法解析媒体文件'));
      }

      const result = {
        path: path,
        format: metadata.format.format_name || '未知',
        duration: Math.round(metadata.format.duration || 0),
        size: metadata.format.size || 0
      };

      // 提取视频流信息
      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      if (videoStream) {
        result.video = {
          codec: videoStream.codec_name || '未知',
          resolution: `${videoStream.width || 0}x${videoStream.height || 0}`,
          fps: videoStream.r_frame_rate ? eval(videoStream.r_frame_rate).toFixed(2) : '未知',
          bitrate: Math.round((videoStream.bit_rate || 0) / 1000)
        };
      }

      // 提取音频流信息
      const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
      if (audioStream) {
        result.audio = {
          codec: audioStream.codec_name || '未知',
          sampleRate: audioStream.sample_rate || 0,
          channels: audioStream.channels || 0,
          bitrate: Math.round((audioStream.bit_rate || 0) / 1000)
        };
      }

      resolve(result);
    });
  });
}

module.exports = {
  getMediaDetails
};