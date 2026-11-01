#!/bin/zsh
# usage: send2.sh <id> <talk|listen|present> <start-url> [go]   – 3D bank v2 (owner 27/10): right-third medium shot, one clip at a time, CAPMIN floor
export KLING_HOME=~/.config/kling NODE_USE_ENV_PROXY=1
COMMON="Static locked camera, no zoom, no camera movement. The same teacher stays in exactly the same place, pose, framing and style as the first frame for the whole clip. Legs and feet do not move, no walking, no stepping, no crossing legs, does not turn away or turn sideways. No counting on fingers, no thumbs up, no pointing at the camera, hands never go above the shoulders and never cover the face. The whiteboard stays completely blank: no text, no letters, no drawings. No other people, no extra hands. Smooth, continuous, natural motion. At the end the teacher returns to the starting pose with hands loosely clasped at the waist, facing the camera."
case $2 in
listen) PRE="The teacher listens warmly with the mouth CLOSED the whole time: the lips stay pressed together for the entire clip, the teacher never opens the mouth, never forms words, never makes an oh or surprised mouth. A gentle closed-mouth smile, small slow nods, natural blinks, eyes open, hands stay loosely clasped at the waist exactly as in the first frame and do not move.";;
present) PRE="The teacher explains calmly to the camera at a relaxed teaching pace (about two words per second) with short pauses where the mouth closes briefly; eyes open, natural blinks. Twice during the clip the teacher lifts one open hand to shoulder height, palm up, and makes a brief friendly presenting gesture up and to the left toward the empty whiteboard, glancing at it for a moment, then looks back at the camera with relaxed open-palm explaining gestures at chest height.";;
excited) PRE="The teacher explains with genuine enthusiasm to the camera at a relaxed teaching pace (about two words per second) with short pauses where the mouth closes briefly; a big warm smile, lively eyes, a couple of energetic but small open-arm gestures at chest height, an encouraging nod.";;
question) PRE="The teacher asks the viewer a friendly question at a relaxed pace (about two words per second): a curious slight head tilt, eyebrows raised, both palms turned up at chest height in a small open shrug, then waits with a warm smile and the mouth closed for a moment, then explains again with relaxed open-palm gestures.";;
wow) PRE="The teacher reveals a fun fact: first a short closed-mouth smile, then eyebrows lift in delighted surprise with a bright open smile, a small lean toward the camera, then explains it calmly at a relaxed pace (about two words per second) with relaxed open-palm gestures at chest height.";;
listen2) PRE="The teacher listens warmly with the mouth CLOSED the whole time (lips together, no talking): a gentle smile, the head tilts slightly to one side as if interested, slow small nods, natural blinks, eyes open, hands stay loosely clasped at the waist.";;
*) PRE="The teacher explains calmly to the camera at a relaxed teaching pace (about two words per second) with short pauses where the mouth closes briefly; eyes open, natural blinks, an occasional small nod; slow relaxed open-palm explaining gestures at chest height.";;
esac
LOCK="The teacher stays on the RIGHT side of the frame for the entire clip, exactly where she or he stands in the first frame; she or he never moves, drifts or slides toward the centre of the frame; the left part of the frame shows only the empty whiteboard the whole time. The torso and hips stay still and upright: no swaying, no rocking, no leaning side to side, feet planted; the teacher stands as still as a TV news presenter; only the arms, hands, head and face move."
PROMPT="$PRE $LOCK $COMMON"
printf '%s\n' kling image_to_video --model kling-video-v2_5 --image "$3" --duration 10 --resolution 1080p --enable_audio false --prompt "$PROMPT" --poll=1200 > dry_$1.txt
[ "$4" = go ] || { cat dry_$1.txt; exit 0; }
B=$(kling account 2>&1 | grep -o '"availableRemainCredits": *[0-9]*' | grep -o '[0-9]*$')
[ -n "$CAPMIN" ] && [ "$B" -gt $((CAPMIN + 50)) ] || { echo "CAP balance $B floor $CAPMIN"; exit 9; }
kling image_to_video --model kling-video-v2_5 --image "$3" --duration 10 --resolution 1080p --enable_audio false --prompt "$PROMPT" --poll=1200 > out_$1.json 2>&1
A=$(kling account 2>&1 | grep -o '"availableRemainCredits": *[0-9]*' | grep -o '[0-9]*$')
GEN=$(grep -o '"generationId": *"[^"]*"' out_$1.json | head -1 | sed 's/.*: *"//;s/"//')
echo "$1 $2 kling-video-v2_5 gen=$GEN credits $B -> $A" | tee -a ../ledger.txt
U=$(grep -o '"urlWithoutWatermark": *"[^"]*"' out_$1.json | head -1 | sed 's/.*: *"//;s/"//'); [ -n "$U" ] && curl -s -o $1.mp4 "$U" && ls -la $1.mp4
