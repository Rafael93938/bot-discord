console.log("🔥 SISTEMA AVANÇADO DE PONTO 🔥");

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

// ===== CONFIG =====
const TOKEN = process.env.TOKEN;
const CLIENT_ID = '1487980597598228501';
const GUILD_ID = '1014742605499736064';
// ==================

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const pontos = new Map();

// ===== FORMATAR DATA (SEM SEGUNDOS) =====
function formatarData(data) {
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ===== COMANDOS =====
const commands = [
  new SlashCommandBuilder()
    .setName('iniciar')
    .setDescription('Criar canal de ponto'),

  new SlashCommandBuilder()
    .setName('ponto')
    .setDescription('Iniciar seu ponto')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

// Registrar comandos
(async () => {
  try {
    console.log('🔄 Registrando comandos...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('✅ Comandos registrados!');
  } catch (err) {
    console.error(err);
  }
})();

// ===== EVENTOS =====
client.on('interactionCreate', async interaction => {

  // ===== SLASH =====
  if (interaction.isChatInputCommand()) {

    const user = interaction.user;
    const guild = interaction.guild;

    // ===== /iniciar =====
    if (interaction.commandName === 'iniciar') {

      await interaction.deferReply({ ephemeral: true });

      const nomeCanal = `ponto-${user.username}`.toLowerCase();

      const existente = guild.channels.cache.find(c => c.name === nomeCanal);

      if (existente) {
        return interaction.editReply({
          content: `⚠️ Você já tem um canal: ${existente}`
        });
      }

      const canal = await guild.channels.create({
        name: nomeCanal,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: guild.roles.everyone,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages
            ]
          }
        ]
      });

      await interaction.editReply({
        content: `✅ Canal criado: ${canal}`
      });

      canal.send(`👋 ${user}, use **/ponto** aqui.`);
    }

    // ===== /ponto =====
    if (interaction.commandName === 'ponto') {

      if (!interaction.channel.name.startsWith('ponto-')) {
        return interaction.reply({
          content: '❌ Use esse comando no seu canal de ponto.',
          ephemeral: true
        });
      }

      const agora = new Date();

      pontos.set(user.id, {
        inicio: agora
      });

      const embed = new EmbedBuilder()
        .setTitle('📂 GERENCIANDO SEU BATE-PONTO')
        .setColor('Blue')
        .addFields(
          { name: '👤 Usuário:', value: user.tag },
          { name: '🕒 Início:', value: formatarData(agora) }
        );

      const botoes = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('pausar')
          .setLabel('Pausar')
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId('voltar')
          .setLabel('Voltar')
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId('finalizar')
          .setLabel('Finalizar')
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.reply({
        embeds: [embed],
        components: [botoes]
      });
    }
  }

  // ===== BOTÕES =====
  if (interaction.isButton()) {

    const data = pontos.get(interaction.user.id);
    if (!data) return;

    const agora = new Date();

    if (interaction.customId === 'pausar') {
      data.pausa = agora;
      return interaction.reply({ content: '⏸️ Pausado', ephemeral: true });
    }

    if (interaction.customId === 'voltar') {
      data.volta = agora;
      return interaction.reply({ content: '▶️ Voltou', ephemeral: true });
    }

    if (interaction.customId === 'finalizar') {

      const inicio = data.inicio;
      const termino = agora;

      const diff = termino - inicio;

      const horas = Math.floor(diff / (1000 * 60 * 60));
      const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      const campos = [
        { name: '👤 Usuário:', value: interaction.user.tag },
        { name: '🕒 Início:', value: formatarData(inicio) }
      ];

      if (data.pausa) {
        campos.push({ name: '⏸️ Pausa:', value: formatarData(data.pausa) });
      }

      if (data.volta) {
        campos.push({ name: '▶️ Volta:', value: formatarData(data.volta) });
      }

      campos.push(
        { name: '⛔ Término:', value: formatarData(termino) },
        { name: '⏳ Tempo:', value: `${horas}h ${minutos}m` }
      );

      const embed = new EmbedBuilder()
        .setTitle('📂 GERENCIANDO SEU BATE-PONTO')
        .setColor('Red')
        .addFields(campos);

      pontos.delete(interaction.user.id);

      await interaction.update({
        embeds: [embed],
        components: []
      });
    }
  }
});

// ===== LOGIN =====
client.login(TOKEN);