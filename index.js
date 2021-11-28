// Require the necessary discord.js classes
const { Client, Intents } = require('discord.js');
const { token } = require('./config.json');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  entersState,
  StreamType,
  AudioPlayerStatus,
  VoiceConnectionStatus,
} = require('@discordjs/voice');
const axios = require('axios').default;
const { createDiscordJSAdapter } = require('./adapter');

// Create a new client instance
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
});
const player = createAudioPlayer();

function playSong(url) {
  const resource = createAudioResource(url, {
    inputType: StreamType.Arbitrary,
  });

  player.play(resource);

  return entersState(player, AudioPlayerStatus.Playing, 5e3);
}

async function connectToChannel(channel) {
  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: createDiscordJSAdapter(channel),
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 30e3);
    return connection;
  } catch (error) {
    connection.destroy();
    throw error;
  }
}

// When the client is ready, run this code (only once)
client.once('ready', () => {
  console.log('Ready!');
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'ping') {
    await interaction.reply('Pong!');
  } else if (commandName === 'server') {
    await interaction.reply('Server info.');
  } else if (commandName === 'user') {
    await interaction.reply('User info.');
  }
});

const prefix = '!'; // just an example, change to whatever you want

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.trim().split(/:+/g);
  const cmd = args[0].slice(prefix.length).toLowerCase(); // case INsensitive, without prefix

  if (cmd === 'speak') {
    if (args[2]) return message.reply('Too many arguments.');
    message.reply(args[1]);

    const channel = message.member?.voice.channel;

    if (channel) {
      try {
        const connection = await connectToChannel(channel);
        connection.subscribe(player);
        const audioFileUrl = (
          await axios.get(
            `http://ec2-16-170-224-19.eu-north-1.compute.amazonaws.com:3000/speak`,
            { params: { text: args[1] } }
          )
        ).data;
        playSong(audioFileUrl);
        message.reply('Playing now!');
      } catch (error) {
        console.error(error);
      }
    } else {
      message.reply('Join a voice channel then try again!');
    }
  }
});

// Login to Discord with your client's token
client.login(token);
