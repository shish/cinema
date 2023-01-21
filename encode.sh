#!/usr/bin/env bash

INPUT=$1
BASE="${1%.*}"

if [ -f $BASE.srt ] ; then
	ffmpeg -i $BASE.srt $BASE.vtt
fi

if [ -f $INPUT ] ; then
	ffmpeg -i $INPUT \
		-filter_complex \
		"[0:v]split=4[v1][v2][v3][v4]; \
		[v1]copy[v1out]; [v2]scale=w=-2:h=720[v2out]; [v3]scale=w=-2:h=480[v3out]; [v4]scale=w=-2:h=360[v4out]" \
		-map [v1out] -c:v:0 libx264 -x264-params "nal-hrd=cbr:force-cfr=1" -b:v:0 5M -maxrate:v:0 5M -minrate:v:0 5M -bufsize:v:0 10M -preset slow -g 48 -sc_threshold 0 -keyint_min 48 \
		-map [v2out] -c:v:1 libx264 -x264-params "nal-hrd=cbr:force-cfr=1" -b:v:1 3M -maxrate:v:1 3M -minrate:v:1 3M -bufsize:v:1 3M -preset slow -g 48 -sc_threshold 0 -keyint_min 48 \
		-map [v3out] -c:v:2 libx264 -x264-params "nal-hrd=cbr:force-cfr=1" -b:v:2 2M -maxrate:v:2 2M -minrate:v:2 2M -bufsize:v:2 2M -preset slow -g 48 -sc_threshold 0 -keyint_min 48 \
		-map [v4out] -c:v:3 libx264 -x264-params "nal-hrd=cbr:force-cfr=1" -b:v:3 1M -maxrate:v:3 1M -minrate:v:3 1M -bufsize:v:3 1M -preset slow -g 48 -sc_threshold 0 -keyint_min 48 \
		-map a:0 -c:a:0 aac -b:a:0 96k -ac 2 \
		-map a:0 -c:a:1 aac -b:a:1 96k -ac 2 \
		-map a:0 -c:a:2 aac -b:a:2 48k -ac 2 \
		-map a:0 -c:a:3 aac -b:a:3 48k -ac 2 \
		-f hls \
		-hls_time 2 \
		-hls_playlist_type vod \
		-hls_flags independent_segments \
		-hls_segment_type mpegts \
		-hls_segment_filename ${BASE}_%v/data%02d.ts \
		-master_pl_name ${BASE}.m3u8 \
		-var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2 v:3,a:3" ${BASE}_%v/index.m3u8
fi
