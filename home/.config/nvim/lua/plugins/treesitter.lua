return {
  {
    'nvim-treesitter/nvim-treesitter',
    branch = 'master',
    lazy = false,
    build = ':TSUpdate',
    opts = {
      ensure_installed = {
        'bash', 'javascript', 'json', 'lua', 'nix', 'python', 'rust', 'swift',
        'tsx', 'typescript', 'vim', 'vimdoc',
      },
      auto_install = true,
      highlight = { enable = true },
    },
    config = function(_, opts)
      require('nvim-treesitter.configs').setup(opts)
    end,
  },
}
