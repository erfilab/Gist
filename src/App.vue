<template>
    <v-app style="position: relative">
        <v-touch v-on:tap="deselect">
            <v-app-bar elevation="4" app dark clipped-left clipped-right>
                <v-toolbar-title style="margin-right: 20px"> Blurt-Ed</v-toolbar-title>
            </v-app-bar>

            <v-main style="margin: 20px 40px 80px 40px; position: relative;">
                <SemanticText :semantic_text="this.text"></SemanticText>
                <MyCursor id="my_cursor" />
            </v-main>
        </v-touch>

        <!--    <router-view/>-->
        <!--        <v-fab-transition>-->
        <v-btn
            :color="this.cancelButtonColor"
            fab
            dark
            absolute
            bottom
            left
            style="position: fixed; bottom: 15px; left: 36px"
            @click="deleteText"
        >
            <v-icon>mdi-close</v-icon>
        </v-btn>
        <!--        </v-fab-transition>-->
        <v-touch v-on:press="pressSpeak" v-on:pressup="releaseSpeak">
            <v-btn
                :color="this.speakButtonColor"
                fab
                dark
                absolute
                bottom
                right
                style="position: fixed; bottom: 15px; right: 36px"
                v-touch:tap="pressSpeak"
            >
                <v-icon>mdi-microphone</v-icon>
            </v-btn>
        </v-touch>

        <v-touch id="to_modify_area" style="display: none">
            <SwipeText/>
        </v-touch>
        <div id="speaking_area" style="display: none"></div>
        <!-- <div id="speaking_area" v-if="voice2text.length > 0" >
                {{voice2text}}
            </div> -->
    </v-app>
</template>

<script>
import SemanticText from "@/components/SemanticText";
import SwipeText from "@/components/SwipeText";
import MyCursor from "@/components/MyCursor";

import {io} from "socket.io-client";

const nowDay = new Date().toISOString().slice(0, 10);
let socket = null;
let context, processor, audioContext, globalStream, audioInput;
// let stream = null;

export default {
    name: "App",

    data: () => ({
        text: "Once upon a time, there was a king; who used to wear a single horned crown. He had a lavish palace, three beautiful wives, and seven children; all well qualified in their respective fields. The king was reaching the retirement age, so he asked his elder son to lead his empire so that he could undergo seclusion. Now, his Elder Son, Jonathan had set other plans for himself. So he turned down his father’s offer. Jonathan was a nature lover; and he wished to live in a thatched house within the deepest parts of the jungle. The king was disheartened; but he accepted Jonathan’s plea. He asked Jonathan’s immediate junior brother Sharlie to handle the loads of the throne. Sharlie accepted; but on a clause – whenever Jonathan would change his mind, Sharlie would return his throne to him. ",
        cancelButtonColor: "grey",
        speakButtonColor: "grey",
        voice2text: "",

        resultError: false,
        speechLang: "en-US",
    }),

    components: {
        MyCursor,
        SemanticText,
        SwipeText,
    },

    computed: {
        selected_val() {
            return this.$store.state.selected;
        },
        isSpeaking_val() {
            return this.$store.state.isSpeaking;
        },
        voice2text_val() {
            return this.voice2text;
        },
    },

    watch: {
        // change the color of the cancel button
        selected_val() {
            if (this.$store.state.selected === false) {
                this.cancelButtonColor = "grey";
                // remove the background color of the selected text
                this.$store.state.selected_elements.forEach((ele) => {
                    // ele.style.removeProperty("background-color");
                    ele.style.backgroundColor = "#E0E0E0";
                });
                this.$store.commit("clear_element");
            } else {
                this.cancelButtonColor = "red";
            }
        },

        isSpeaking_val() {
            // when the user wants to replace the selected words
            // make a <div> for the selected elements
            if (this.$store.state.selected && this.$store.state.isSpeaking) {
                const to_modify_area = document.getElementById("to_modify_area");
                to_modify_area.style.removeProperty("display");
                // find the inserted location
                const firstElement = this.$store.state.selected_elements[0];
                firstElement.parentNode.insertBefore(
                    to_modify_area,
                    firstElement.nextElementSibling
                );
                this.$store.state.selected_elements.forEach((ele) => {
                    ele.style.display = "none";
                });

                // add a speaking area for inserted text
                const divParent = document.createElement("div");
                to_modify_area.parentNode.insertBefore(
                    divParent,
                    to_modify_area.nextElementSibling
                );
                // the speaking area
                const speaking_area = document.getElementById("speaking_area");
                speaking_area.style.removeProperty("display");
                speaking_area.style.backgroundColor = "#E0E0E0";
                speaking_area.style.marginBottom = "10px";
                speaking_area.style.minHeight = "20px";
                speaking_area.style.width = "100%";
                // speaking_area.style.padding = "0.5rem";
                speaking_area.innerHTML = this.voice2text;
                divParent.appendChild(to_modify_area);
                divParent.appendChild(speaking_area);
            }
            // when the user deletes something and then speaks
            if (!this.$store.state.selected && this.$store.state.isSpeaking) {
                console.log("find your cursor");
            }
        },

        voice2text_val() {
            const speaking_area = document.getElementById("speaking_area");
            speaking_area.innerHTML = this.voice2text;
        },
    },

    methods: {
        deselect: function () {
            this.$store.commit("deselect_text"); // selected = false
        },
        pressSpeak: function () {
            this.speakButtonColor = "green";
            this.$store.commit("start_speak");

            socket.emit("startRecording");
            audioContext = window.AudioContext || window.webkitAudioContext;
            context = new audioContext({latencyHint: "interactive"});
            processor = context.createScriptProcessor(2048, 1, 1);
            processor.connect(context.destination);
            context.resume();

            const handleSuccess = (stream) => {
                globalStream = stream;
                audioInput = context.createMediaStreamSource(stream);
                audioInput.connect(processor);

                processor.onaudioprocess = (e) => {
                    if (!socket) {
                        return;
                    }
                    socket.emit(
                        "BINARY_DATA",
                        this.downsampleBuffer(e.inputBuffer.getChannelData(0), 44100, 16000)
                    );
                };
            };

            navigator.mediaDevices
                .getUserMedia({audio: true, video: false})
                .then(handleSuccess);
        },
        releaseSpeak: function () {
            this.speakButtonColor = "grey";
            this.$store.commit("stop_speak");

            socket.emit("endRecording");
            let track = globalStream.getTracks()[0];
            track.stop();
            audioInput.disconnect(processor);
            processor.disconnect(context.destination);
            context.close().then(() => {
                audioContext = null;
                context = null;
                processor = null;
                audioInput = null;
                globalStream = null;
            });
        },
        deleteText: function () {
            if (this.$store.state.selected) {
                const parentNode = this.$store.state.selected_elements[0].parentNode;
                this.$store.state.selected_elements.forEach((ele) => {
                    parentNode.removeChild(ele);
                });
                this.$store.commit("clear_element");
                this.$store.commit("deselect_text");
            }
        },

        // for speech recognition
        downsampleBuffer(buffer, sampleRate, outSampleRate) {
            if (outSampleRate === sampleRate) {
                return buffer;
            }
            if (outSampleRate > sampleRate) {
                throw "downsampling rate show be smaller than original sample rate";
            }
            let sampleRateRatio = sampleRate / outSampleRate;
            let newLength = Math.round(buffer.length / sampleRateRatio);
            let result = new Int16Array(newLength);
            let offsetResult = 0;
            let offsetBuffer = 0;
            while (offsetResult < result.length) {
                let nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
                let accum = 0,
                    count = 0;
                for (
                    let i = offsetBuffer;
                    i < nextOffsetBuffer && i < buffer.length;
                    i++
                ) {
                    accum += buffer[i];
                    count++;
                }

                result[offsetResult] = Math.min(1, accum / count) * 0x7fff;
                offsetResult++;
                offsetBuffer = nextOffsetBuffer;
            }
            return result.buffer;
        },
    },
    async created() {
        this.speakButtonColor = "grey";
        this.$store.commit("deselect_text");
        this.$store.commit("stop_speak");
        this.$store.commit("clear_element");

        // speech recognition socket innitialization
        socket = io("http://localhost:3000/" + nowDay);

        socket.on("INTERIM_TRANSCRIPT", (data) => {
            //   console.log("interim:", data);
            this.voice2text = data;
        });

        socket.on("FINAL_TRANSCRIPT", (data) => {
            console.log("final:", data);
            this.voice2text = data;
        });

        socket.emit("joinRoom", "default_room_name");
    },
    beforeUnmount() {
        // socket.emit("leaveRoom", "default_room_name");
        socket.disconnect();
    },
};
</script>
