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
      -- tree-sitter 0.26 removed --no-bindings, which the legacy plugin passes by default.
      require('nvim-treesitter.install').ts_generate_args = {
        'generate', '--abi', tostring(vim.treesitter.language_version),
      }
      require('nvim-treesitter.configs').setup(opts)
    end,
  },
}
